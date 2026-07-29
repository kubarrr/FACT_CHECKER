// Biblioteka: powtórki (SRS), słownik, mapa umiejętności i historia.
// Czyta wyłącznie lokalny magazyn (KRYTYKAI_STORE) – żadnego backendu.

(() => {
  "use strict";

  const C = globalThis.KRYTYKAI_CATALOG;
  const S = globalThis.KRYTYKAI_STORE;
  const E = globalThis.KRYTYKAI_ESCO;
  const STR = globalThis.KRYTYKAI_STRINGS;
  const SETTINGS_KEY = "krytykai_settings";

  // Język interfejsu = ustawienie „App language". Podstawiany w starcie.
  let t = STR.forLang("en");
  let uiLang = "en";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let settings = {};
  let activeTab = "review";
  // Filtry – domyślnie zawężone do języka z profilu, żeby po zmianie języka
  // nauki nie mieszać w powtórkach fiszek z poprzedniego. `null` = wszystkie.
  let vocabLang;
  let reviewLang;
  let vocabSort = "recent";
  let vocabProOnly = false; // filtr słownictwa zawodowego (most kariera↔słownik)

  function currentLang() {
    const p = settings.profile || {};
    return p.targetLangCode || C.codeFromLegacyName(p.targetLang) || null;
  }

  // --- Formatowanie ---------------------------------------------------------
  let dtf = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" });
  let tf = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" });

  function setUiLang(lang) {
    uiLang = String(lang || "en").toLowerCase().slice(0, 2);
    t = STR.forLang(uiLang);
    const loc = uiLang === "pl" ? "pl-PL" : uiLang;
    dtf = new Intl.DateTimeFormat(loc, { day: "numeric", month: "long", year: "numeric" });
    tf = new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit" });
    document.documentElement.lang = uiLang;
  }

  function dayLabel(key) {
    const today = S.dayKey(new Date());
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (key === today) return t("today");
    if (key === S.dayKey(y)) return t("yesterday");
    return dtf.format(new Date(`${key}T12:00:00`));
  }

  function relFuture(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return t("now");
    const h = Math.round(ms / 3600000);
    if (h < 24) return t("inHours", Math.max(1, h));
    return t("inDays", Math.round(h / 24));
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function toast(text) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // Umiejętności lekcji to obiekty {uri, title, essential} – gwiazdka oznacza
  // umiejętność kluczową dla zawodu.
  function skillTagsHtml(skills) {
    if (!skills?.length) return "";
    const tags = skills
      .map((s) => `<span class="tag">${s.essential ? "★ " : ""}${esc(s.title)}</span>`)
      .join("");
    return `<div class="lesson-tags">${tags}</div>`;
  }

  function emptyState(emoji, title, body) {
    return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
  }

  // --- Motyw sekcji (opcja B) ----------------------------------------------
  // Baza (tło/karty/tekst) jest neutralna i stała; zmienia się tylko akcent,
  // żeby Kariera nie nosiła barw języka. „career" i „profile→career" dostają
  // akcent zawodowy, zakładki językowe flagę, reszta neutralny indygo.
  const LANGUAGE_TABS = new Set(["review", "vocab"]);

  // Stały akcent klastra językowego (podpowiedź na zakładkach) – ustawiany raz,
  // niezależnie od tego, która sekcja jest aktywna.
  function setClusterAccents() {
    const theme = C.themeFor(currentLang() || "en");
    document.documentElement.style.setProperty("--k-lang-primary", theme.primary);
  }

  function applySectionTheme(name) {
    const root = document.documentElement;
    if (LANGUAGE_TABS.has(name)) {
      // Pełny, wyrazisty motyw flagi (z tłem) — tak jak lubił użytkownik.
      C.applyTheme(root, currentLang() || "en");
      root.dataset.section = "lang";
    } else if (name === "career") {
      C.applyThemeObject(root, C.CAREER_THEME);
      root.dataset.section = "career";
    } else {
      C.applyThemeObject(root, C.NEUTRAL_THEME);
      root.dataset.section = "neutral";
    }
  }

  // --- Nagłówek -------------------------------------------------------------
  // Nagłówek ma dwie tożsamości: językową (flaga, poziom, XP) na zakładkach
  // języka i zawodową (zawód, pokrycie) na Karierze. Seria jest wspólna.
  async function renderHeader() {
    const st = await S.getDashboardStats({ language: reviewLang });
    const hero = $("hero");
    hero.dataset.mode = activeTab === "career" ? "career" : "lang";

    $("heroStreak").textContent = `🔥 ${st.streak}`;
    $("heroStreak").title = t("streakDays", st.streak);

    if (activeTab === "career") {
      await renderCareerHero(st);
    } else {
      renderLanguageHero(st);
    }

    // Kafelki i odznaki to postęp ŁĄCZNY — wspólne dla obu światów.
    $("stats").innerHTML = [
      { n: st.due_count, l: t("statDue"), due: true },
      { n: st.vocab_count, l: t("statVocab") },
      { n: st.mastered_count, l: t("statMastered") },
      { n: st.lessons_count, l: t("statLessons") },
    ]
      .map((s) => `<div class="stat${s.due ? " is-due" : ""}"><div class="stat-n">${s.n}</div><div class="stat-l">${esc(s.l)}</div></div>`)
      .join("");

    $("badges").innerHTML = C.BADGES.map((b) => {
      const got = st.badges.includes(b.id);
      return `<span class="badge${got ? "" : " locked"}" title="${esc(C.pick(b.description, uiLang))}"><em>${b.icon}</em>${esc(C.pick(b.name, uiLang))}</span>`;
    }).join("");

    const pill = $("duePill");
    pill.textContent = st.due_count;
    pill.hidden = st.due_count === 0;
  }

  function renderLanguageHero(st) {
    const lang = C.findLanguage(currentLang() || "");
    const lvl = C.getUserAppLevel(st.xp, uiLang);
    $("heroFlag").textContent = lang ? lang.flag : "📚";
    // Wielki tytuł = język (tożsamość). Poziom CEFR pod spodem. Nazwa rangi XP
    // („Liść") ląduje przy pasku XP, bo to ranga za punkty, nie poziom języka.
    $("heroLevel").textContent = lang ? lang.name : t("heroSubEmpty");
    $("heroSub").textContent = lang ? t("heroCefr", settings.profile?.level || "A2") : "";
    $("xpFill").style.width = `${lvl.progress}%`;
    $("xpNow").textContent = `${st.xp} XP · ${lvl.name}`;
    $("xpNext").textContent = lvl.next > st.xp ? t("xpToNext", lvl.next - st.xp) : t("xpMax");
  }

  async function renderCareerHero(st) {
    const occ = await E.getSavedOccupation();
    if (!occ) {
      $("heroFlag").textContent = "🧭";
      $("heroLevel").textContent = t("tabCareer");
      $("heroSub").textContent = t("noOccupationTitle");
      $("xpFill").style.width = "0%";
      $("xpNow").textContent = "";
      $("xpNext").textContent = "";
      return;
    }
    const summary = await S.getSkillSummary({ occupationUri: occ.uri });
    const touched = new Set(summary.map((s) => s.uri).filter(Boolean));
    const ess = occ.essential || [];
    const covered = ess.filter((s) => touched.has(s.uri)).length;
    const pct = ess.length ? Math.round((covered / ess.length) * 100) : 0;

    $("heroFlag").textContent = "🧭";
    $("heroLevel").textContent = occ.title;
    $("heroSub").textContent = t("coverageLabel");
    $("xpFill").style.width = `${pct}%`;
    $("xpNow").textContent = `${covered}/${ess.length}`;
    $("xpNext").textContent = `${pct}%`;
  }

  // --- Zakładka: powtórki ---------------------------------------------------
  let queue = [];
  let sessionDone = 0;
  let flipped = false;

  async function renderReview() {
    const el = $("panel-review");
    // Powtórki dotyczą TYLKO aktualnie uczonego języka — bez przełącznika,
    // słówka z innych języków nie mieszają się do sesji.
    reviewLang = currentLang();
    if (!queue.length) {
      queue = await S.getDueVocab({ limit: 20, language: reviewLang });
      sessionDone = 0;
    }

    if (!queue.length) {
      const all = await S.getVocab({ language: reviewLang });
      if (!all.length) {
        const lang = C.findLanguage(reviewLang);
        el.innerHTML = emptyState(
          "🌱",
          lang ? t("emptyVocabLangTitle", lang.name) : t("emptyVocabTitle"),
          t("emptyVocabBody")
        );
        return;
      }
      const next = all.slice().sort((a, b) => new Date(a.due_at) - new Date(b.due_at))[0];
      el.innerHTML = emptyState(
        "✅",
        t("allReviewedTitle"),
        t("allReviewedBody", all.length, relFuture(next.due_at))
      );
      return;
    }

    const v = queue[0];
    // Pomyłki wracają na koniec kolejki, więc „całość" rośnie w trakcie sesji.
    const done = sessionDone;
    const total = sessionDone + queue.length;
    const answer = flipped
      ? `<div class="card-answer">
           <div class="card-translation">${esc(v.translation || "—")}</div>
           ${v.example ? `<div class="card-example">${esc(v.example)}</div>` : ""}
           ${v.source_url ? `<div class="card-src"><a href="${esc(v.source_url)}" target="_blank" rel="noopener">${esc(t("fromSource"))}: ${esc(hostOf(v.source_url))}</a></div>` : ""}
         </div>`
      : `<div class="card-hint">${esc(t("flipHint"))}</div>`;

    el.innerHTML = `
      <div class="review">
        <div class="review-progress"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
        <div class="card" id="flashcard">
          <div class="card-term">${esc(v.term)}</div>
          ${answer}
        </div>
        ${
          flipped
            ? `<div class="review-actions">
                 <button class="btn btn-bad" data-grade="0">${esc(t("notYet"))}</button>
                 <button class="btn btn-good" data-grade="1">${esc(t("known"))}</button>
               </div>`
            : `<div class="review-actions"><button class="btn btn-primary" id="flipBtn">${esc(t("showAnswer"))}</button></div>`
        }
        <div class="stat-l">${esc(t("inSession", done, total))}</div>
      </div>`;

    const flip = () => {
      flipped = true;
      renderReview();
    };
    $("flashcard").addEventListener("click", flip);
    $("flipBtn")?.addEventListener("click", flip);
    el.querySelectorAll("[data-grade]").forEach((b) =>
      b.addEventListener("click", () => grade(b.dataset.grade === "1"))
    );
  }

  async function grade(correct) {
    const v = queue.shift();
    flipped = false;
    sessionDone += 1;
    const res = await S.reviewVocab(v.id, correct);
    // Pomyłka wraca na koniec kolejki – powtórka jeszcze w tej samej sesji.
    if (!correct) queue.push({ ...v, box: 0 });
    for (const b of res?.newBadges || []) toast(`${b.icon} ${t("newBadge", C.pick(b.name, uiLang))}`);
    await renderHeader();
    await renderReview();
  }

  // Skróty klawiszowe: spacja odsłania, 1/2 ocenia.
  document.addEventListener("keydown", (e) => {
    if (activeTab !== "review" || !queue.length) return;
    if (e.code === "Space" && !flipped) {
      e.preventDefault();
      flipped = true;
      renderReview();
    } else if (flipped && (e.key === "1" || e.key === "2")) {
      grade(e.key === "2");
    }
  });

  // --- Zakładka: słownik ----------------------------------------------------
  async function renderVocab() {
    const el = $("panel-vocab");
    // Słownik pokazuje TYLKO aktualnie uczony język (spójnie z Powtórkami).
    vocabLang = currentLang();
    const items = await S.getVocab({ language: vocabLang, sort: vocabSort });
    if (!items.length) {
      const lang = C.findLanguage(vocabLang);
      el.innerHTML = emptyState(
        "📖",
        lang ? t("emptyVocabLangTitle", lang.name) : t("emptyDictTitle"),
        t("emptyDictBody")
      );
      return;
    }

    const sortChips = [
      ["recent", t("sortRecent")],
      ["alpha", t("sortAlpha")],
      ["box", t("sortBox")],
    ]
      .map(([k, label]) => `<button class="chip" data-sort="${k}" aria-pressed="${vocabSort === k}">${label}</button>`)
      .join("");

    // Filtr „zawodowe" (most kariera↔słownik) – tylko gdy takie słówka są.
    const hasPro = items.some((v) => v.pro);
    const shown = vocabProOnly ? items.filter((v) => v.pro) : items;
    const proChip = hasPro
      ? `<button class="chip${vocabProOnly ? "" : ""}" data-pro aria-pressed="${vocabProOnly}">💼 ${esc(t("proVocab"))}</button>`
      : "";

    el.innerHTML = `
      <div class="toolbar">
        ${proChip}
        <span class="spacer"></span>
        ${sortChips}
      </div>
      <div class="grid">
        ${shown
          .map(
            (v) => `
          <div class="vcard${v.pro ? " vcard-pro" : ""}">
            <button class="vcard-del" data-del="${esc(v.id)}" title="${esc(t("deleteWord"))}">×</button>
            ${v.pro ? `<span class="vcard-pro-tag" title="${esc(t("proVocabHint"))}">💼</span>` : ""}
            <div class="vcard-term">${esc(v.term)}</div>
            <div class="vcard-tr">${esc(v.translation)}</div>
            ${v.example ? `<div class="vcard-ex">${esc(v.example)}</div>` : ""}
            <div class="boxdots" title="${esc(t("boxStage", v.box, S.MAX_BOX))}">
              ${Array.from({ length: S.MAX_BOX }, (_, i) => `<i class="${i < v.box ? "on" : ""}"></i>`).join("")}
            </div>
          </div>`
          )
          .join("")}
      </div>`;

    el.querySelector("[data-pro]")?.addEventListener("click", () => {
      vocabProOnly = !vocabProOnly;
      renderVocab();
    });
    el.querySelectorAll("[data-sort]").forEach((b) =>
      b.addEventListener("click", () => {
        vocabSort = b.dataset.sort;
        renderVocab();
      })
    );
    el.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        await S.deleteVocab(b.dataset.del);
        await renderHeader();
        renderVocab();
      })
    );
  }

  // --- Zakładka: kariera ----------------------------------------------------
  async function renderCareer() {
    const el = $("panel-career");
    // Pokrycie i lekcje dotyczą AKTYWNEJ persony (jej zawodu), nie wszystkich.
    const occ = await E.getSavedOccupation();
    const skills = await S.getSkillSummary({ occupationUri: occ?.uri || null });
    const lessons = await S.getLessons({ mode: "career", limit: 30 });

    if (!lessons.length) {
      el.innerHTML = emptyState(
        "🧭",
        t("emptyCareerTitle"),
        t("emptyCareerBody")
      );
      return;
    }

    // Pokrycie względem oficjalnych umiejętności zawodu. To jedyna metryka tutaj,
    // która mierzy coś poza samą częstotliwością czytania: ile z tego, czego
    // zawód naprawdę wymaga, w ogóle dotknąłeś.
    const touchedUris = new Set(skills.map((s) => s.uri).filter(Boolean));

    let coverageHtml = "";
    if (occ) {
      const ess = occ.essential || [];
      const opt = occ.optional || [];
      const covEss = ess.filter((s) => touchedUris.has(s.uri)).length;
      const covOpt = opt.filter((s) => touchedUris.has(s.uri)).length;
      const pct = ess.length ? Math.round((covEss / ess.length) * 100) : 0;
      const gaps = ess.filter((s) => !touchedUris.has(s.uri));

      coverageHtml = `
        <div class="cov">
          <div class="cov-head">
            <div>
              <div class="cov-occ">${esc(occ.title)}</div>
              <div class="stat-l">${esc(t("coverageLabel"))}</div>
            </div>
            <div class="cov-num">${covEss}<span>/${ess.length}</span></div>
          </div>
          <div class="skill-bar"><i style="width:${pct}%"></i></div>
          <div class="stat-l" style="margin-top:8px">
            ${esc(t("coverageOptional", covOpt, opt.length))}
          </div>
        </div>

        ${
          gaps.length
            ? `<div class="day-h">${esc(t("gapsTitle", gaps.length))}</div>
               <div class="gap-tags">
                 ${gaps
                   .slice(0, 24)
                   .map(
                     (g) =>
                       `<a class="gap-tag gap-link" target="_blank" rel="noopener"
                           href="https://www.google.com/search?q=${encodeURIComponent(g.title + (uiLang === "pl" ? " kurs" : " course"))}"
                           title="${esc(t("gapSearch", g.title))}">${esc(g.title)}</a>`
                   )
                   .join("")}
               </div>`
            : `<div class="gapbox">${esc(t("gapsNone"))}</div>`
        }`;
    } else {
      coverageHtml = `
        <div class="gapbox">
          <h3>${esc(t("noOccupationTitle"))}</h3>
          <p class="stat-l" style="margin:0 0 10px">${esc(t("noOccupationBody"))}</p>
          <button class="btn btn-primary" id="goProfile">${esc(t("pickOccupation"))}</button>
        </div>`;
    }

    const max = skills[0]?.count || 1;
    const skillsHtml = skills
      .map(
        (s) => `
      <div class="skill">
        <div class="skill-head">
          <span class="skill-tag">${s.essential ? "★ " : ""}${esc(s.tag)}</span>
          <span class="skill-count">${esc(t("lessonsCount", s.count))}</span>
        </div>
        <div class="skill-bar"><i style="width:${(s.count / max) * 100}%"></i></div>
        <div class="skill-srcs">
          ${s.sources
            .map(
              (src) =>
                `<a class="srclink" href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title || hostOf(src.url))}</a>`
            )
            .join("")}
        </div>
      </div>`
      )
      .join("");

    const recent = lessons
      .slice(0, 8)
      .map((l) => {
        const takeaways = (l.payload?.takeaways || []).slice(0, 2);
        return `
        <div class="lesson">
          <div class="lesson-head">
            <span class="lesson-mode">📖</span>
            <span class="lesson-topic">${esc(l.topic || l.source_title || "Lekcja")}</span>
            <span class="lesson-time">${dayLabel(S.dayKey(new Date(l.created_at)))}</span>
          </div>
          ${
            takeaways.length
              ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13.5px;">${takeaways
                  .map((t) => `<li>${esc(String(t).replace(/\*\*/g, ""))}</li>`)
                  .join("")}</ul>`
              : ""
          }
          ${skillTagsHtml(l.skills)}
        </div>`;
      })
      .join("");

    el.innerHTML = `
      ${coverageHtml}
      ${skills.length ? `<div class="day-h">${esc(t("touched"))}</div>${skillsHtml}` : ""}
      <div class="day-h">${esc(t("recentLessons"))}</div>
      ${recent}
      ${occ ? `<p class="attrib">${esc(t("escoAttribution"))}</p>` : ""}`;

    $("goProfile")?.addEventListener("click", () => selectTab("profile"));
  }

  // --- Zakładka: historia ---------------------------------------------------
  async function renderHistory() {
    const el = $("panel-history");
    const lessons = await S.getLessons({ limit: 200 });
    if (!lessons.length) {
      el.innerHTML = emptyState("🗂️", t("emptyHistoryTitle"), t("emptyHistoryBody"));
      return;
    }

    const activity = await S.getActivity(84);
    const heat = activity
      .map((a) => `<i data-n="${Math.min(a.count, 3)}" title="${dayLabel(a.day)}: ${a.count}"></i>`)
      .join("");

    const byDay = new Map();
    for (const l of lessons) {
      const key = S.dayKey(new Date(l.created_at));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(l);
    }

    const days = [...byDay.entries()]
      .map(
        ([day, items]) => `
      <div class="day-h">${esc(dayLabel(day))}</div>
      ${items
        .map(
          (l) => `
        <div class="lesson">
          <div class="lesson-head">
            <span class="lesson-mode">${l.mode === "lingo" ? "🗣️" : "📖"}</span>
            <span class="lesson-topic">${esc(l.topic || l.source_title || "Lekcja")}</span>
            <span class="lesson-time">${tf.format(new Date(l.created_at))}</span>
          </div>
          ${
            l.source_url
              ? `<a class="lesson-src" href="${esc(l.source_url)}" target="_blank" rel="noopener">${esc(l.source_title || l.source_url)}</a>`
              : ""
          }
          ${skillTagsHtml(l.skills)}
        </div>`
        )
        .join("")}`
      )
      .join("");

    el.innerHTML = `<div class="heat">${heat}</div>${days}`;
  }

  // --- Zakładka: profil -----------------------------------------------------
  // Wszystko, co personalizuje lekcje. Ustawienia wtyczki zostają techniczne
  // (silnik, klucz, adres serwera) – tu jest to, co użytkownik zmienia naprawdę.
  const PROFILE_FIELDS = [
    { key: "role", label: "fieldRole", placeholder: "phRole" },
    { key: "industry", label: "fieldIndustry", placeholder: "phIndustry" },
    { key: "goals", label: "fieldGoals", placeholder: "phGoals" },
    { key: "skills", label: "fieldSkills", placeholder: "phSkills" },
    { key: "interests", label: "fieldInterests", placeholder: "phInterests" },
  ];

  // Wybór zawodu z ESCO. Wyszukiwarka jest leksykalna, więc pokazujemy listę
  // trafień do wzrokowego wyboru zamiast zgadywać za użytkownika.
  function occupationBoxHtml(occ) {
    if (occ) {
      const n = (occ.essential?.length || 0) + (occ.optional?.length || 0);
      return `
        <div class="occ-current">
          <div>
            <div class="occ-title">${esc(occ.title)}</div>
            <div class="stat-l">${esc(t("skillCounts", occ.essential?.length || 0, occ.optional?.length || 0, n))}</div>
          </div>
          <button class="btn" id="occClear">${esc(t("change"))}</button>
        </div>`;
    }
    return `
      <div class="occ-search">
        <input type="text" id="occQuery" placeholder="${esc(t("occupationPlaceholder"))}" />
        <button class="btn btn-primary" id="occSearch">${esc(t("search"))}</button>
      </div>
      <div class="stat-l" id="occHint">${esc(t("escoHint"))}</div>
      <div id="occResults"></div>`;
  }

  // Wyszukiwarka zawodu operująca na KONKRETNEJ personie.
  function bindOccupationBox(el, occ, personaId, onChange) {
    if (occ) {
      el.querySelector("#occClear")?.addEventListener("click", async () => {
        await E.clearPersonaOccupation(personaId);
        onChange();
      });
      return;
    }
    const run = async () => {
      const q = el.querySelector("#occQuery").value;
      const hint = el.querySelector("#occHint");
      const box = el.querySelector("#occResults");
      hint.textContent = t("searching");
      try {
        const results = await E.searchOccupations(q, uiLang);
        hint.textContent = results.length ? t("escoPickHint") : t("escoNoHits");
        box.innerHTML = results
          .map((r) => `<button class="occ-hit" data-uri="${esc(r.uri)}">${esc(r.title)}</button>`)
          .join("");
        box.querySelectorAll("[data-uri]").forEach((b) =>
          b.addEventListener("click", async () => {
            hint.textContent = t("escoFetching");
            try {
              await E.setPersonaOccupation(personaId, b.dataset.uri, uiLang);
              onChange();
            } catch (err) {
              hint.textContent = t("escoFetchError", err.message);
            }
          })
        );
      } catch (err) {
        hint.textContent = t("escoSearchError", err.message);
      }
    };
    el.querySelector("#occSearch").addEventListener("click", run);
    el.querySelector("#occQuery").addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });
  }

  async function renderProfile() {
    const el = $("panel-profile");
    await E.ensureMigrated(settings.profile);
    const personas = await E.getPersonas();
    const active = await E.getActivePersona();
    const p = settings.profile || {};

    const nativeSel = p.nativeLangCode || C.codeFromLegacyName(p.nativeLang);
    const targetSel = p.targetLangCode || C.codeFromLegacyName(p.targetLang);
    const langOptions = (selected) =>
      `<option value="">${esc(t("pickOne"))}</option>` +
      C.LANGUAGES.map(
        (l) => `<option value="${l.code}"${l.code === selected ? " selected" : ""}>${l.flag} ${esc(l.name)}</option>`
      ).join("");

    // --- Sekcja PERSONY -----------------------------------------------------
    const personaChips = personas
      .map(
        (pr) => `
        <button class="persona-chip${pr.id === active?.id ? " active" : ""}${pr.real ? " real" : ""}" data-persona="${esc(pr.id)}">
          <span class="persona-chip-kind">${pr.real ? "👤 " + esc(t("realProfile")) : "🧪 " + esc(t("virtualProfile"))}</span>
          <span class="persona-chip-name">${esc(pr.label || pr.occupation?.title || "—")}</span>
          ${pr.id === active?.id ? `<span class="persona-chip-badge">${esc(t("activeBadge"))}</span>` : ""}
        </button>`
      )
      .join("");
    const canAdd = personas.length < E.MAX_PERSONAS;

    const personaEditor = active
      ? `
      <div class="persona-editor">
        <label class="field">
          <span>${esc(t("personaLabel"))}</span>
          <input type="text" id="pLabel" value="${esc(active.label || "")}" placeholder="${esc(t("phPersonaLabel"))}" />
        </label>
        ${occupationBoxHtml(active.occupation)}
        ${PROFILE_FIELDS.map(
          (f) => `
          <label class="field">
            <span>${esc(t(f.label))}</span>
            <input type="text" data-pcf="${f.key}" value="${esc(active[f.key] || "")}" placeholder="${esc(t(f.placeholder))}" />
          </label>`
        ).join("")}
        <div class="form-actions">
          <button class="btn btn-primary" id="savePersona">${esc(t("savePersona"))}</button>
          <button class="btn" id="removePersona">${esc(t("removePersona"))}</button>
          <span class="stat-l" id="pMsg"></span>
        </div>
      </div>`
      : `<div class="gapbox">${esc(t("noPersonas"))}</div>`;

    el.innerHTML = `
      <div class="form">
        <h3 class="form-h">${esc(t("personasSection"))}</h3>
        <div class="persona-chips">
          ${personaChips}
          ${canAdd ? `<button class="persona-chip persona-add" id="addPersona">+ ${esc(t("newPersona"))}</button>` : ""}
        </div>
        ${personaEditor}
      </div>

      <div class="form" style="margin-top:16px">
        <h3 class="form-h">${esc(t("languagesOnly"))}</h3>
        <div class="field-row">
          <label class="field">
            <span>${esc(t("yourLanguage"))}</span>
            <select id="lNative">${langOptions(nativeSel)}</select>
          </label>
          <label class="field">
            <span>${esc(t("learnLanguage"))}</span>
            <select id="lTarget">${langOptions(targetSel)}</select>
          </label>
        </div>
        <span class="field-label">${esc(t("levelLabel"))}</span>
        <div class="levels" id="lvlPicker">
          ${C.LEVELS.map(
            (l) => `
            <button type="button" class="lvl" data-level="${l.code}" aria-pressed="${(p.level || "A2") === l.code}">
              <b>${esc(l.label)}</b><span>${esc(C.pick(l.description, uiLang))}</span>
            </button>`
          ).join("")}
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" id="saveLanguages">${esc(t("saveLanguages"))}</button>
          <span class="stat-l" id="saveMsg"></span>
        </div>
      </div>`;

    // --- Persony: interakcje ------------------------------------------------
    el.querySelectorAll("[data-persona]").forEach((b) =>
      b.addEventListener("click", async () => {
        await E.setActivePersona(b.dataset.persona);
        toast(t("personaActivated"));
        await renderHeader();
        renderProfile();
      })
    );
    $("addPersona")?.addEventListener("click", async () => {
      try {
        await E.addPersona({ label: "" });
        renderProfile();
      } catch {
        toast(t("maxPersonasReached"));
      }
    });
    if (active) {
      bindOccupationBox(el, active.occupation, active.id, renderProfile);
      $("savePersona").addEventListener("click", async () => {
        const patch = { label: $("pLabel").value.trim() };
        el.querySelectorAll("[data-pcf]").forEach((i) => (patch[i.dataset.pcf] = i.value.trim()));
        await E.updatePersona(active.id, patch);
        toast(t("personaSaved"));
        await renderHeader();
        $("pMsg").textContent = t("saved");
        setTimeout(() => ($("pMsg").textContent = ""), 2000);
      });
      $("removePersona").addEventListener("click", async () => {
        if (!confirm(t("confirmRemovePersona"))) return;
        await E.removePersona(active.id);
        await renderHeader();
        renderProfile();
      });
    }

    // --- Języki: interakcje -------------------------------------------------
    let level = p.level || "A2";
    el.querySelectorAll("#lvlPicker .lvl").forEach((b) =>
      b.addEventListener("click", () => {
        level = b.dataset.level;
        el.querySelectorAll("#lvlPicker .lvl").forEach((x) =>
          x.setAttribute("aria-pressed", String(x.dataset.level === level))
        );
      })
    );
    $("saveLanguages").addEventListener("click", async () => {
      const prev = settings.profile || {};
      const next = { ...prev, level };
      next.nativeLangCode = $("lNative").value;
      next.targetLangCode = $("lTarget").value;
      next.nativeLang = C.ENGLISH_NAMES[next.nativeLangCode] || "";
      next.targetLang = C.ENGLISH_NAMES[next.targetLangCode] || "";

      const langChanged = next.targetLangCode !== prev.targetLangCode;
      settings = { ...settings, profile: next };
      await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
      if (langChanged) {
        vocabLang = currentLang();
        reviewLang = currentLang();
        queue = [];
        setClusterAccents();
      }
      await renderHeader();
      toast(t("profileSaved"));
      $("saveMsg").textContent = t("saved");
      setTimeout(() => ($("saveMsg").textContent = ""), 2000);
    });
  }

  // --- Zakładki -------------------------------------------------------------
  const RENDERERS = {
    review: renderReview,
    vocab: renderVocab,
    career: renderCareer,
    history: renderHistory,
    profile: renderProfile,
  };

  function selectTab(name) {
    activeTab = name;
    document.querySelectorAll(".tab").forEach((t) =>
      t.setAttribute("aria-selected", String(t.dataset.tab === name))
    );
    for (const key of Object.keys(RENDERERS)) $(`panel-${key}`).hidden = key !== name;
    // Motyw i tożsamość nagłówka idą za sekcją (opcja B).
    applySectionTheme(name);
    renderHeader();
    RENDERERS[name]();
  }

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => selectTab(t.dataset.tab))
  );

  // Napisy osadzone w HTML (zakładki, stopka) – ustawiane raz przy starcie.
  function applyStaticLabels() {
    const map = {
      review: "tabReview", vocab: "tabVocab", career: "tabCareer",
      history: "tabHistory", profile: "tabProfile",
    };
    document.querySelectorAll(".tab").forEach((el) => {
      const key = map[el.dataset.tab];
      if (!key) return;
      // Pigułka z licznikiem jest osobnym elementem – nie nadpisujemy jej.
      const pill = el.querySelector(".pill");
      el.textContent = t(key) + " ";
      if (pill) el.appendChild(pill);
    });
    document.querySelectorAll("[data-grouplabel]").forEach((el) => {
      el.textContent = t(el.dataset.grouplabel);
    });
    $("footerNote").textContent = t("localOnly");
    $("exportBtn").textContent = t("exportJson");
    $("settingsBtn").textContent = t("settings");
    document.title = `${t("libraryTitle")} · Fact Checker AI`;
  }

  $("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("exportBtn").addEventListener("click", async () => {
    const data = await S.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `krytykai-biblioteka-${S.dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(t("exported"));
  });

  // --- Start ----------------------------------------------------------------
  (async () => {
    const data = await chrome.storage.sync.get(SETTINGS_KEY);
    settings = data[SETTINGS_KEY] || {};
    setUiLang(settings.language);
    applyStaticLabels();
    setClusterAccents();
    vocabLang = currentLang();
    reviewLang = currentLang();

    // selectTab ustawia motyw sekcji i renderuje nagłówek, więc wchodzimy
    // przez nią (bez osobnego renderHeader, żeby nie renderować dwa razy).
    if (!currentLang()) {
      // Bez języka nauki zaczynamy od profilu, żeby było widać, czego brakuje.
      selectTab("profile");
      return;
    }
    const st = await S.getDashboardStats();
    selectTab(st.due_count > 0 || st.vocab_count === 0 ? "review" : "vocab");
  })();
})();
