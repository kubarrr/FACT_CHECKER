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
