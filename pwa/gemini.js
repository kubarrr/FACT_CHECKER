// Wywołanie Gemini API bezpośrednio z przeglądarki (model BYOK – klucz użytkownika).
// Uwaga: to darmowy wariant „przynieś własny klucz". W wersji płatnej ten plik
// zostanie zastąpiony wywołaniem Twojego backendu (bez klucza po stronie klienta).

import {
  buildSystemPrompt,
  buildUserPrompt,
  parseModelJson,
  buildAskSystemPrompt,
  buildAskUserPrompt,
} from "./prompt.js";

const MAX_INPUT_CHARS = 8000;
const MAX_OUTPUT_TOKENS = 700;
const LEARN_OUTPUT_TOKENS = 1100;
const ASK_OUTPUT_TOKENS = 500;

// Generyczne wywołanie Gemini zwracające sparsowany JSON (dla trybów uczących).
export async function runGeminiJSON({ apiKey, model, system, user, maxTokens }) {
  const m = model || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.6,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens || LEARN_OUTPUT_TOKENS,
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {}
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return parseLooseJson(text);
}

// Parser JSON bez wymogu pola „questions" (dla My Story / Linglerno).
function parseLooseJson(text) {
  if (!text) throw new Error("Pusta odpowiedź modelu");
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

export async function analyzeWithGemini({ apiKey, model, userQuestion, answerText, numQuestions, language }) {
  const trimmed = (answerText || "").slice(0, MAX_INPUT_CHARS);
  const system = buildSystemPrompt(numQuestions, language);
  const user = buildUserPrompt({ userQuestion, answerText: trimmed });
  const m = model || "gemini-3.1-flash-lite";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.6,
      responseMimeType: "application/json",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {}
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return parseModelJson(text);
}

// Odpowiedź na pytanie do sprawdzanego tekstu (ścieżka z własnym kluczem).
export async function askWithGemini({ apiKey, model, question, answerText, language }) {
  return runGeminiJSON({
    apiKey,
    model,
    system: buildAskSystemPrompt(language),
    user: buildAskUserPrompt({ question, content: answerText }),
    maxTokens: ASK_OUTPUT_TOKENS,
  });
}
