// Lokalny magazyn postępów (Etap 0 + 1) – bez żadnego backendu ani konta.
//
// Wszystko leży w chrome.storage.local. Kształt rekordów celowo naśladuje
// tabele Lingvido (snake_case, `id`, `created_at`), żeby późniejsze przejście na
// Supabase było zwykłym uploadem tablic, a nie migracją danych.
//
// UWAGA: to NIE jest moduł ES – patrz komentarz w catalog.js.

(() => {
  "use strict";

  const K_LESSONS = "krytykai_lessons";
  const K_VOCAB = "krytykai_vocab";
  const K_SKILLS = "krytykai_skill_events";
  const K_STATS = "krytykai_stats";

  // Górne limity – chronią przed rozdęciem storage przy intensywnym używaniu.
  // Przy przekroczeniu odpadają najstarsze rekordy (poza słówkami w powtórkach).
  const MAX_LESSONS = 500;
  const MAX_VOCAB = 3000;
  const MAX_SKILL_EVENTS = 2000;

  // Leitner: pudełko → odstęp do następnej powtórki (w dniach).
  // Pudełko 0 wraca tego samego dnia, 5 oznacza „opanowane".
  const BOX_INTERVALS = [0, 1, 3, 7, 21, 60];
  const MAX_BOX = BOX_INTERVALS.length - 1;

  const DEFAULT_STATS = {
    xp: 0,
    streak: 0,
    last_lesson_day: null, // "YYYY-MM-DD" w czasie lokalnym
    lessons_count: 0,
    reviews_done: 0,
    reviews_correct: 0,
    badges: [],
  };

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Dzień lokalny użytkownika, nie UTC – seria ma się zgadzać z jego kalendarzem.
  function dayKey(d) {
    const t = d || new Date();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const day = String(t.getDate()).padStart(2, "0");
    return `${t.getFullYear()}-${m}-${day}`;
  }

  function daysBetween(aKey, bKey) {
    const a = new Date(`${aKey}T00:00:00`);
    const b = new Date(`${bKey}T00:00:00`);
    return Math.round((b - a) / 86400000);
  }

  async function get(keys) {
    return chrome.storage.local.get(keys);
  }

  async function readAll() {
    const d = await get([K_LESSONS, K_VOCAB, K_SKILLS, K_STATS]);
    return {
      lessons: d[K_LESSONS] || [],
      vocab: d[K_VOCAB] || [],
      skillEvents: d[K_SKILLS] || [],
      stats: { ...DEFAULT_STATS, ...(d[K_STATS] || {}) },
    };
  }

  async function getStats() {
    const d = await get(K_STATS);
    return { ...DEFAULT_STATS, ...(d[K_STATS] || {}) };
  }

  // Statystyki wzbogacone o liczniki liczone na bieżąco (do odznak i nagłówka).
  async function getDashboardStats() {
    const { lessons, vocab, stats } = await readAll();
    const now = Date.now();
    return {
      ...stats,
      vocab_count: vocab.length,
      due_count: vocab.filter((v) => new Date(v.due_at).getTime() <= now).length,
      mastered_count: vocab.filter((v) => v.box >= MAX_BOX).length,
      lingo_lessons: lessons.filter((l) => l.mode === "lingo").length,
      career_lessons: lessons.filter((l) => l.mode === "career").length,
    };
  }

  function dueAtFor(box) {
    const days = BOX_INTERVALS[Math.min(box, MAX_BOX)];
    const d = new Date();
    if (days === 0) {
      // Świeże/pomylone słówko wraca w tej samej sesji, ale nie natychmiast.
      d.setMinutes(d.getMinutes() + 10);
    } else {
      d.setDate(d.getDate() + days);
      d.setHours(4, 0, 0, 0); // rano następnego dnia, nie o tej samej godzinie
    }
    return d.toISOString();
  }

  // --- Zapis lekcji ---------------------------------------------------------

  // Wyciąga słówka z odpowiedzi Linglerno (vocab + phrases jako jeden zbiór).
  function vocabFromLingo(r) {
    const items = [];
    for (const v of r.vocab || []) {
      if (!v?.term) continue;
      items.push({ term: String(v.term).trim(), translation: String(v.translation || "").trim(), example: String(v.example || "").trim(), kind: "word" });
    }
    for (const p of r.phrases || []) {
      if (!p?.phrase) continue;
      items.push({ term: String(p.phrase).trim(), translation: String(p.translation || "").trim(), example: "", kind: "phrase" });
    }
    return items;
  }

  // Model zwraca albo identyfikatory z menu ESCO ("s3"), albo — gdy zawód nie
  // jest wybrany — wolne etykiety. Jedno i drugie sprowadzamy do wspólnego
  // kształtu {uri, title, essential}; `uri` odróżnia umiejętność z klasyfikacji
  // od tagu wymyślonego przez model.
  function resolveSkills(list, occupation) {
    const raw = Array.isArray(list) ? list : [];
    const options = occupation?.options || [];

    if (options.length) {
      const byId = new Map(options.map((o) => [String(o.id).toLowerCase(), o]));
      const out = [];
      const seen = new Set();
      for (const item of raw) {
        const hit = byId.get(String(item || "").trim().toLowerCase());
        if (!hit || seen.has(hit.uri)) continue;
        seen.add(hit.uri);
        out.push({ uri: hit.uri, title: hit.title, essential: !!hit.essential });
      }
      return out.slice(0, 3);
    }

    return raw
      .map((s) => String(s || "").trim().toLowerCase())
      .filter((s) => s.length > 1 && s.length <= 40)
      .slice(0, 4)
      .map((title) => ({ uri: null, title, essential: false }));
  }

  /**
   * Zapisuje wynik lekcji (lingo albo career) i aktualizuje XP/serię/odznaki.
   * Zwraca podsumowanie do pokazania w panelu.
   */
  async function saveLesson({ mode, sourceUrl, sourceTitle, result, profile, occupation }) {
    const C = globalThis.KRYTYKAI_CATALOG;
    const store = await readAll();
    const p = profile || {};
    const now = new Date();
    const nowIso = now.toISOString();
    const today = dayKey(now);

    const lesson = {
      id: uid(),
      mode, // "lingo" | "career"
      source_url: sourceUrl || "",
      source_title: (sourceTitle || "").slice(0, 300),
      target_language: p.targetLangCode || "",
      native_language: p.nativeLangCode || "",
      level: p.level || "",
      topic: mode === "lingo" ? extractTopic(result) : (result.topic || sourceTitle || "").slice(0, 120),
      payload: result,
      skills: mode === "career" ? resolveSkills(result.skills, occupation) : [],
      occupation_uri: occupation?.uri || null,
      xp_earned: C.XP_PER_LESSON,
      created_at: nowIso,
    };

    // Nowe słówka – bez duplikatów w obrębie tego samego języka docelowego.
    const newVocab = [];
    if (mode === "lingo") {
      const seen = new Set(
        store.vocab.map((v) => `${v.target_language}|${v.term.toLowerCase()}`)
      );
      for (const item of vocabFromLingo(result)) {
        const key = `${lesson.target_language}|${item.term.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        newVocab.push({
          id: uid(),
          lesson_id: lesson.id,
          term: item.term,
          translation: item.translation,
          example: item.example,
          kind: item.kind,
          target_language: lesson.target_language,
          native_language: lesson.native_language,
          source_url: lesson.source_url,
          box: 0,
          due_at: dueAtFor(0),
          correct_count: 0,
          wrong_count: 0,
          last_reviewed_at: null,
          created_at: nowIso,
        });
      }
    }

    const newSkillEvents = lesson.skills.map((s) => ({
      id: uid(),
      lesson_id: lesson.id,
      skill_uri: s.uri,
      skill_tag: s.title,
      essential: s.essential,
      source_url: lesson.source_url,
      source_title: lesson.source_title,
      created_at: nowIso,
    }));

    // Seria: liczona po dniach kalendarzowych, nie po 24h.
    const last = store.stats.last_lesson_day;
    let streak = store.stats.streak;
    let streakBonus = 0;
    if (!last) {
      streak = 1;
    } else {
      const gap = daysBetween(last, today);
      if (gap === 0) {
        // druga lekcja tego samego dnia – seria bez zmian, bez bonusu
      } else if (gap === 1) {
        streak = streak + 1;
        streakBonus = C.XP_STREAK_BONUS;
      } else {
        streak = 1; // przerwa
      }
    }

    const stats = {
      ...store.stats,
      xp: store.stats.xp + lesson.xp_earned + streakBonus,
      streak,
      last_lesson_day: today,
      lessons_count: store.stats.lessons_count + 1,
    };

    const lessons = [lesson, ...store.lessons].slice(0, MAX_LESSONS);
    const vocab = [...newVocab, ...store.vocab].slice(0, MAX_VOCAB);
    const skillEvents = [...newSkillEvents, ...store.skillEvents].slice(0, MAX_SKILL_EVENTS);

    const badgeCtx = {
      ...stats,
      vocab_count: vocab.length,
      reviews_done: stats.reviews_done,
    };
    const newBadges = C.BADGES.filter(
      (b) => !stats.badges.includes(b.id) && b.condition(badgeCtx)
    );
    stats.badges = [...stats.badges, ...newBadges.map((b) => b.id)];

    await chrome.storage.local.set({
      [K_LESSONS]: lessons,
      [K_VOCAB]: vocab,
      [K_SKILLS]: skillEvents,
      [K_STATS]: stats,
    });

    return {
      lesson,
      xpEarned: lesson.xp_earned + streakBonus,
      streakBonus,
      streak,
      savedVocab: newVocab.length,
      newBadges,
      dueCount: vocab.filter((v) => new Date(v.due_at).getTime() <= Date.now()).length,
    };
  }

  // Temat lekcji językowej – pierwsze podświetlone [[słowo]] streszczenia
  // albo pierwsze słówko z listy. Służy tylko za etykietę w historii.
  function extractTopic(r) {
    const m = String(r.summary_target || "").match(/\[\[([^\]]+)\]\]/);
    if (m) return m[1].slice(0, 120);
    const first = (r.vocab || [])[0];
    return first?.term ? String(first.term).slice(0, 120) : "";
  }

  // --- Powtórki (SRS) -------------------------------------------------------

  /** Słówka do powtórki: najpierw najbardziej zaległe. */
  async function getDueVocab({ limit = 20, language = null } = {}) {
    const d = await get(K_VOCAB);
    const all = d[K_VOCAB] || [];
    const now = Date.now();
    return all
      .filter((v) => (!language || v.target_language === language))
      .filter((v) => new Date(v.due_at).getTime() <= now)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
      .slice(0, limit);
  }

  /** Ocena powtórki. Poprawnie → pudełko wyżej, błąd → z powrotem do zera. */
  async function reviewVocab(id, correct) {
    const C = globalThis.KRYTYKAI_CATALOG;
    const d = await get([K_VOCAB, K_STATS]);
    const vocab = d[K_VOCAB] || [];
    const stats = { ...DEFAULT_STATS, ...(d[K_STATS] || {}) };
    const idx = vocab.findIndex((v) => v.id === id);
    if (idx === -1) return null;

    const v = vocab[idx];
    const box = correct ? Math.min(v.box + 1, MAX_BOX) : 0;
    const updated = {
      ...v,
      box,
      due_at: dueAtFor(box),
      correct_count: v.correct_count + (correct ? 1 : 0),
      wrong_count: v.wrong_count + (correct ? 0 : 1),
      last_reviewed_at: new Date().toISOString(),
    };
    vocab[idx] = updated;

    stats.reviews_done += 1;
    if (correct) {
      stats.reviews_correct += 1;
      stats.xp += C.XP_PER_REVIEW_CORRECT;
    }
    const newBadges = C.BADGES.filter(
      (b) => !stats.badges.includes(b.id) && b.condition({ ...stats, vocab_count: vocab.length })
    );
    stats.badges = [...stats.badges, ...newBadges.map((b) => b.id)];

    await chrome.storage.local.set({ [K_VOCAB]: vocab, [K_STATS]: stats });
    return { item: updated, stats, newBadges };
  }

  // --- Odczyty dla biblioteki ----------------------------------------------

  async function getVocab({ language = null, sort = "recent" } = {}) {
    const d = await get(K_VOCAB);
    let all = d[K_VOCAB] || [];
    if (language) all = all.filter((v) => v.target_language === language);
    if (sort === "alpha") {
      all = all.slice().sort((a, b) => a.term.localeCompare(b.term));
    } else if (sort === "box") {
      all = all.slice().sort((a, b) => b.box - a.box || a.term.localeCompare(b.term));
    } else {
      all = all.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return all;
  }

  async function getLessons({ mode = null, limit = 200 } = {}) {
    const d = await get(K_LESSONS);
    let all = d[K_LESSONS] || [];
    if (mode) all = all.filter((l) => l.mode === mode);
    return all.slice(0, limit);
  }

  /** Agregat umiejętności dla „Mojej Kariery": ile razy dotknąłeś każdego tematu. */
  async function getSkillSummary({ days = null } = {}) {
    const d = await get(K_SKILLS);
    let events = d[K_SKILLS] || [];
    if (days) {
      const cutoff = Date.now() - days * 86400000;
      events = events.filter((e) => new Date(e.created_at).getTime() >= cutoff);
    }
    // Grupujemy po URI, gdy umiejętność pochodzi z klasyfikacji – etykieta może
    // się zmienić między wersjami ESCO, identyfikator nie.
    const byKey = new Map();
    for (const e of events) {
      const key = e.skill_uri || e.skill_tag;
      const cur = byKey.get(key) || {
        uri: e.skill_uri || null,
        tag: e.skill_tag,
        essential: !!e.essential,
        count: 0,
        last_at: e.created_at,
        sources: [],
      };
      cur.count += 1;
      if (new Date(e.created_at) > new Date(cur.last_at)) cur.last_at = e.created_at;
      if (cur.sources.length < 5 && e.source_url) {
        cur.sources.push({ url: e.source_url, title: e.source_title || e.source_url });
      }
      byKey.set(key, cur);
    }
    return [...byKey.values()].sort((a, b) => b.count - a.count);
  }

  /** Aktywność dzienna (do „trawnika" w nagłówku biblioteki). */
  async function getActivity(days = 84) {
    const { lessons } = await readAll();
    const counts = new Map();
    for (const l of lessons) counts.set(dayKey(new Date(l.created_at)), (counts.get(dayKey(new Date(l.created_at))) || 0) + 1);
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      out.push({ day: key, count: counts.get(key) || 0 });
    }
    return out;
  }

  // --- Zarządzanie danymi ---------------------------------------------------

  async function deleteVocab(id) {
    const d = await get(K_VOCAB);
    const vocab = (d[K_VOCAB] || []).filter((v) => v.id !== id);
    await chrome.storage.local.set({ [K_VOCAB]: vocab });
  }

  async function deleteLesson(id) {
    const d = await get([K_LESSONS, K_VOCAB, K_SKILLS]);
    await chrome.storage.local.set({
      [K_LESSONS]: (d[K_LESSONS] || []).filter((l) => l.id !== id),
      [K_VOCAB]: (d[K_VOCAB] || []).filter((v) => v.lesson_id !== id),
      [K_SKILLS]: (d[K_SKILLS] || []).filter((e) => e.lesson_id !== id),
    });
  }

  /** Eksport całości – ten sam kształt, który później pójdzie do Supabase. */
  async function exportAll() {
    const all = await readAll();
    return { version: 1, exported_at: new Date().toISOString(), ...all };
  }

  async function clearAll() {
    await chrome.storage.local.remove([K_LESSONS, K_VOCAB, K_SKILLS, K_STATS]);
  }

  globalThis.KRYTYKAI_STORE = {
    BOX_INTERVALS,
    MAX_BOX,
    saveLesson,
    getDueVocab,
    reviewVocab,
    getVocab,
    getLessons,
    getSkillSummary,
    getActivity,
    getStats,
    getDashboardStats,
    deleteVocab,
    deleteLesson,
    exportAll,
    clearAll,
    dayKey,
  };
})();
