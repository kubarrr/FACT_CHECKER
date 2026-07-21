// Testy lokalnego magazynu postępów (bez bazy, bez backendu).
// catalog.js i store.js to zwykłe skrypty przypisujące się do globalThis,
// więc ładujemy je do bieżącego kontekstu po podstawieniu atrapy chrome.storage.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Atrapa chrome.storage.local – zwykła mapa w pamięci.
function installChromeMock() {
  const data = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const k of list) if (k in data) out[k] = data[k];
          return out;
        },
        async set(obj) {
          Object.assign(data, obj);
        },
        async remove(keys) {
          for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
        },
      },
    },
  };
  return data;
}

function loadScripts() {
  for (const rel of ["src/shared/catalog.js", "src/shared/store.js"]) {
    vm.runInThisContext(readFileSync(join(root, rel), "utf8"), { filename: rel });
  }
}

const PROFILE = { targetLangCode: "es", nativeLangCode: "pl", level: "B1" };

const LINGO_RESULT = {
  summary_target: "Un [[artículo]] sobre el clima.",
  vocab: [
    { term: "clima", translation: "klimat", example: "El clima cambia." },
    { term: "sequía", translation: "susza", example: "La sequía es grave." },
  ],
  phrases: [{ phrase: "hace calor", translation: "jest gorąco" }],
};

const CAREER_RESULT = {
  takeaways: ["Zastosuj X w swoim zespole"],
  lesson: "Krótka lekcja.",
  topic: "Systemy rozproszone",
  skills: ["Distributed Systems", "sql", "x"], // "x" za krótkie – ma odpaść
};

beforeEach(() => {
  installChromeMock();
  loadScripts();
});

test("saveLesson: zapisuje słówka i zwroty jako materiał do powtórek", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  const res = await S.saveLesson({
    mode: "lingo",
    sourceUrl: "https://example.com/a",
    sourceTitle: "Artykuł",
    result: LINGO_RESULT,
    profile: PROFILE,
  });

  assert.equal(res.savedVocab, 3); // 2 słówka + 1 zwrot
  assert.equal(res.streak, 1);
  assert.equal(res.xpEarned, 10); // pierwszego dnia bez bonusu za serię

  const vocab = await S.getVocab({});
  assert.equal(vocab.length, 3);
  assert.ok(vocab.every((v) => v.target_language === "es" && v.box === 0));
  assert.ok(vocab.some((v) => v.kind === "phrase"));
});

test("saveLesson: nie duplikuje słówek znanych już z innej lekcji", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  const second = await S.saveLesson({
    mode: "lingo",
    sourceUrl: "https://b.pl",
    result: { ...LINGO_RESULT, vocab: [...LINGO_RESULT.vocab, { term: "lluvia", translation: "deszcz" }] },
    profile: PROFILE,
  });

  assert.equal(second.savedVocab, 1); // tylko nowa "lluvia"
  assert.equal((await S.getVocab({})).length, 4);
});

test("saveLesson: tryb kariery buduje mapę umiejętności, bez słówek", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  const res = await S.saveLesson({
    mode: "career",
    sourceUrl: "https://example.com/post",
    sourceTitle: "Post",
    result: CAREER_RESULT,
    profile: PROFILE,
  });

  assert.equal(res.savedVocab, 0);
  assert.deepEqual(res.lesson.skills, ["distributed systems", "sql"]);

  const summary = await S.getSkillSummary();
  assert.equal(summary.length, 2);
  assert.equal(summary[0].count, 1);
  assert.equal(summary[0].sources[0].url, "https://example.com/post");
});

test("reviewVocab: poprawna odpowiedź przesuwa słówko do wyższego pudełka i odsuwa termin", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  const [first] = await S.getVocab({});

  const res = await S.reviewVocab(first.id, true);
  assert.equal(res.item.box, 1);
  assert.equal(res.item.correct_count, 1);
  // Pudełko 1 = powtórka następnego dnia kalendarzowego (o 4:00), a nie
  // dokładnie za 24 h – dzięki temu seria trzyma się dni, nie godzin.
  assert.equal(S.dayKey(new Date(res.item.due_at)), S.dayKey(new Date(Date.now() + 86400000)));
  assert.ok(new Date(res.item.due_at).getTime() > Date.now());

  const stats = await S.getStats();
  assert.equal(stats.reviews_done, 1);
  assert.equal(stats.xp, 15); // 10 za lekcję + 5 za trafną powtórkę
});

test("reviewVocab: pomyłka cofa słówko do pudełka 0", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  const [first] = await S.getVocab({});

  await S.reviewVocab(first.id, true);
  await S.reviewVocab(first.id, true);
  const res = await S.reviewVocab(first.id, false);

  assert.equal(res.item.box, 0);
  assert.equal(res.item.wrong_count, 1);
  const stats = await S.getStats();
  assert.equal(stats.xp, 20); // bez XP za błąd
});

test("getDueVocab: pokazuje tylko słówka z minionym terminem", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });

  // Świeże słówka mają termin za 10 minut – nie są jeszcze zaległe.
  assert.equal((await S.getDueVocab({})).length, 0);

  // Cofamy termin jednego z nich, udając wczorajszą lekcję.
  const vocab = await S.getVocab({});
  vocab[0].due_at = new Date(Date.now() - 3600 * 1000).toISOString();
  await chrome.storage.local.set({ krytykai_vocab: vocab });

  const due = await S.getDueVocab({});
  assert.equal(due.length, 1);
  assert.equal(due[0].id, vocab[0].id);
});

test("odznaki: pierwsza lekcja odblokowuje 'first_lesson'", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  const res = await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  assert.ok(res.newBadges.some((b) => b.id === "first_lesson"));

  // Druga lekcja nie przyznaje tej samej odznaki ponownie.
  const again = await S.saveLesson({ mode: "career", sourceUrl: "https://b.pl", result: CAREER_RESULT, profile: PROFILE });
  assert.ok(!again.newBadges.some((b) => b.id === "first_lesson"));
});

test("seria: dwie lekcje tego samego dnia nie podbijają licznika", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  const second = await S.saveLesson({ mode: "career", sourceUrl: "https://b.pl", result: CAREER_RESULT, profile: PROFILE });

  assert.equal(second.streak, 1);
  assert.equal(second.streakBonus, 0);
  assert.equal(second.xpEarned, 10);
});

test("seria: lekcja dzień po dniu daje bonus, a przerwa zeruje licznik", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await chrome.storage.local.set({
    krytykai_stats: { xp: 100, streak: 4, last_lesson_day: S.dayKey(yesterday), lessons_count: 4, reviews_done: 0, reviews_correct: 0, badges: [] },
  });

  const res = await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  assert.equal(res.streak, 5);
  assert.equal(res.streakBonus, 10);
  assert.equal(res.xpEarned, 20);

  // Teraz symulujemy przerwę: ostatnia lekcja tydzień temu.
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const stats = await S.getStats();
  await chrome.storage.local.set({ krytykai_stats: { ...stats, last_lesson_day: S.dayKey(weekAgo) } });

  const broken = await S.saveLesson({ mode: "career", sourceUrl: "https://c.pl", result: CAREER_RESULT, profile: PROFILE });
  assert.equal(broken.streak, 1);
  assert.equal(broken.streakBonus, 0);
});

test("deleteLesson: usuwa lekcję razem z jej słówkami i tagami", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  const res = await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  await S.deleteLesson(res.lesson.id);

  assert.equal((await S.getLessons({})).length, 0);
  assert.equal((await S.getVocab({})).length, 0);
});

test("eksport zwraca kształt gotowy do wysłania na backend", async () => {
  const S = globalThis.KRYTYKAI_STORE;
  await S.saveLesson({ mode: "lingo", sourceUrl: "https://a.pl", result: LINGO_RESULT, profile: PROFILE });
  const dump = await S.exportAll();

  assert.equal(dump.version, 1);
  for (const key of ["lessons", "vocab", "skillEvents", "stats"]) assert.ok(key in dump);
  // Rekordy mają pola w konwencji tabel Supabase.
  assert.ok(dump.lessons[0].created_at);
  assert.ok(dump.vocab[0].due_at);
});

test("poziom użytkownika rośnie wraz z XP", () => {
  const C = globalThis.KRYTYKAI_CATALOG;
  assert.equal(C.getUserAppLevel(0).level, 0);
  assert.equal(C.getUserAppLevel(120).level, 1);
  assert.equal(C.getUserAppLevel(99999).progress, 100);
});
