// Testy czystych funkcji promptu (uruchom: `npm test` lub `node --test`).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  langName,
  buildSystemPrompt,
  buildUserPrompt,
  buildStorySystemPrompt,
  buildLingoSystemPrompt,
  heuristicQuestions,
  parseModelJson,
  parseLooseJson,
  buildCommentsUserPrompt,
  buildCommentsSystemPrompt,
  buildAskSystemPrompt,
  buildAskUserPrompt,
} from "../src/shared/prompt.js";

test("langName maps codes and falls back to null", () => {
  assert.equal(langName("pl"), "Polish");
  assert.equal(langName("en-US"), "English");
  assert.equal(langName("xx"), null);
  assert.equal(langName(""), null);
});

test("buildSystemPrompt forces chosen language and always asks for N questions", () => {
  const p = buildSystemPrompt(4, "pl");
  assert.match(p, /Polish/);
  assert.match(p, /ALWAYS give 4 questions/);
  assert.match(p, /Always return exactly 4 questions/);
  // Ma zawierać dzisiejszą datę (świadomość „bieżącego roku").
  assert.match(p, /TODAY'S DATE is \d{4}-\d{2}-\d{2}/);
});

test("buildSystemPrompt adds balance for political/contested topics", () => {
  const p = buildSystemPrompt(4, "pl");
  assert.match(p, /perspective/);
  assert.match(p, /OTHER SIDE/i);
  assert.match(p, /METHODOLOGY/i);
  assert.match(p, /NEUTRAL/i);
  assert.match(p, /"verify"\|"explore"\|"perspective"/);
});

test("buildUserPrompt includes question and content", () => {
  const u = buildUserPrompt({ userQuestion: "Czy to prawda?", answerText: "Treść." });
  assert.match(u, /USER'S QUESTION:/);
  assert.match(u, /Czy to prawda\?/);
  assert.match(u, /CONTENT TO ANALYZE:/);
  assert.match(u, /Treść\./);
});

test("buildStorySystemPrompt: trimmed, query-based read_next, no learn_next", () => {
  const p = buildStorySystemPrompt("pl");
  assert.match(p, /EXACTLY 2 items in read_next/);
  assert.match(p, /"query"/);
  assert.doesNotMatch(p, /learn_next/);
  assert.match(p, /avoid hallucination/i);
});

test("buildLingoSystemPrompt: target-only, [[ ]] highlights, culture in native language", () => {
  const p = buildLingoSystemPrompt(
    { targetLang: "Italian", nativeLang: "Polish", level: "A2", country: "Italy" },
    "pl"
  );
  assert.match(p, /\[\[/); // instrukcja o znacznikach [[ ]]
  assert.match(p, /MUST be in Italian ONLY/);
  assert.match(p, /written in Polish/); // ciekawostka w języku użytkownika
  assert.doesNotMatch(p, /"pos"/); // słownik bez kolorów/części mowy
});

test("heuristicQuestions: clickbait -> 2 sharp verify questions", () => {
  const r = heuristicQuestions("SZOK! Nie uwierzysz co się stało!!! To skandal!", 4);
  assert.equal(r.assessment.type, "clickbait");
  assert.equal(r.assessment.risk, "high");
  assert.equal(r.questions.length, 2);
  assert.ok(r.questions.every((q) => q.kind === "verify"));
});

test("heuristicQuestions: plain factual result -> curiosity questions up to N", () => {
  const r = heuristicQuestions("Real Madryt wygrał mecz 3:1 w sezonie 2024 ligi mistrzów.", 4);
  assert.equal(r.assessment.type, "fact");
  assert.equal(r.assessment.risk, "low");
  assert.equal(r.questions.length, 4);
  assert.ok(r.questions.every((q) => q.kind === "explore"));
});

test("heuristicQuestions is deterministic for identical input", () => {
  const a = heuristicQuestions("Jakiś neutralny tekst informacyjny o pogodzie.", 4);
  const b = heuristicQuestions("Jakiś neutralny tekst informacyjny o pogodzie.", 4);
  assert.deepEqual(a, b);
});

test("parseModelJson: strips code fences and requires questions[]", () => {
  const ok = parseModelJson('```json\n{"questions":[{"q":"a"}],"summary":"s"}\n```');
  assert.equal(ok.summary, "s");
  assert.equal(ok.questions.length, 1);
  assert.throws(() => parseModelJson('{"summary":"no questions"}'), /questions/);
  assert.throws(() => parseModelJson(""), /Pusta/);
});

test("parseLooseJson: parses learning-mode JSON without questions[]", () => {
  const r = parseLooseJson('noise {"takeaways":["x"],"lesson":"y"} trailing');
  assert.deepEqual(r.takeaways, ["x"]);
  assert.equal(r.lesson, "y");
});

test("buildCommentsUserPrompt: numbers comments from 1 and caps their length", () => {
  const items = [{ text: "pierwszy" }, { text: "drugi" }, { text: "x".repeat(900) }];
  const out = buildCommentsUserPrompt(items);
  // Model odsyła indeksy, więc numeracja od 1 jest częścią kontraktu.
  assert.match(out, /^1\. pierwszy$/m);
  assert.match(out, /^2\. drugi$/m);
  assert.ok(!out.includes("x".repeat(601)), "pojedynczy komentarz musi być przycięty");
});

test("buildCommentsSystemPrompt: judges comments, never their authors", () => {
  const p = buildCommentsSystemPrompt("pl");
  assert.match(p, /never label a person/i);
  assert.match(p, /never infer anything about the person/i);
  // Ostry ton nie może być sam w sobie powodem odrzucenia.
  assert.match(p, /Strong language does NOT disqualify/i);
  // Pusta lista musi być dozwolona, inaczej model będzie naciągał.
  assert.match(p, /empty "top" is a valid answer/i);
});

test("buildStorySystemPrompt: rejects only the genuinely unrelated, not other domains", () => {
  const p = buildStorySystemPrompt("pl");
  assert.match(p, /"relevant"/);
  assert.match(p, /leave takeaways and read_next EMPTY/i);
  // Metafora nie może uchodzić za trafność — to był objaw (przepis → EEG).
  assert.match(p, /just as X, so/i);
  // Ale inna dziedzina z tą samą umiejętnością MA być trafna (rolnictwo dla analityka).
  assert.match(p, /different domain/i);
  assert.match(p, /agriculture/i);
  assert.match(p, /when in doubt, lean\s+towards relevant/i);
});

test("buildLingoSystemPrompt: culture note follows the target language, no country field", () => {
  // Pole kraju usunięte — ciekawostka zawsze idzie za językiem nauki, więc
  // stary/nieaktualny kraj nie ma jak przeciec (objaw: hiszpański → Włochy).
  const p = buildLingoSystemPrompt({ targetLang: "Spanish", country: "Italy" }, "pl");
  assert.match(p, /a country where Spanish is spoken/i);
  assert.doesNotMatch(p, /Italy/);
});

test("buildSystemPrompt: flags carry a kind for on-page colouring", () => {
  const p = buildSystemPrompt(4, "pl");
  assert.match(p, /"kind": "verify"\|"explore"/);
});

test("buildAskSystemPrompt: wymusza język i rozdziela treść artykułu od wiedzy modelu", () => {
  const p = buildAskSystemPrompt("pl");
  assert.match(p, /Answer in Polish/);
  // Trzy podstawy odpowiedzi — bez nich UI nie ma czego oznaczyć.
  assert.match(p, /"article"/);
  assert.match(p, /"model"/);
  assert.match(p, /"unknown"/);
  // Sedno: zgadywanie podane jako treść artykułu to jedyny błąd, który boli.
  assert.match(p, /Never dress up general knowledge/i);
});

test("buildAskUserPrompt: niesie pytanie i tekst, oba przycięte", () => {
  const p = buildAskUserPrompt({ question: "Kto to policzył?", content: "Artykuł o podatku." });
  assert.match(p, /Kto to policzył\?/);
  assert.match(p, /Artykuł o podatku\./);

  const long = buildAskUserPrompt({ question: "q".repeat(900), content: "c".repeat(9000) });
  assert.equal((long.match(/q/g) || []).length, 500);
  assert.equal((long.match(/c/g) || []).length, 6000);
});

test("buildAskUserPrompt: brak pytania i treści nie wywala budowania", () => {
  const p = buildAskUserPrompt({});
  assert.match(p, /THE READER'S QUESTION:/);
  assert.match(p, /THE TEXT THEY READ:/);
});
