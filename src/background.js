import { loadSettings } from "./shared/defaults.js";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildMediaSystemPrompt,
  buildMediaUserPrompt,
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  buildLingoSystemPrompt,
  buildLingoUserPrompt,
  heuristicQuestions,
  parseModelJson,
  parseLooseJson,
} from "./shared/prompt.js";

const MAX_INPUT_CHARS = 8000;
const MAX_ONDEVICE_CHARS = 4000; // krótsze wejście = szybsza inferencja lokalna
const MAX_OUTPUT_TOKENS = 700;
const MAX_MEDIA_BYTES = 6 * 1024 * 1024; // limit rozmiaru pobieranego obrazu

// Prosty cache wyników – ta sama treść nie jest analizowana dwa razy.
const resultCache = new Map();
const CACHE_MAX = 40;

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}
function cacheGet(key) {
  return resultCache.get(key);
}
function cacheSet(key, value) {
  resultCache.set(key, value);
  if (resultCache.size > CACHE_MAX) {
    resultCache.delete(resultCache.keys().next().value);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "krytykai-verify-selection",
    title: "Fact Checker AI: verify selected text",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "krytykai-verify-page",
    title: "Fact Checker AI: verify this page / news",
    contexts: ["page"],
  });
  chrome.contextMenus.create({
    id: "krytykai-verify-media",
    title: "Fact Checker AI: check this image / video",
    contexts: ["image", "video"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "krytykai-verify-media") {
    chrome.tabs.sendMessage(tab.id, {
      type: "KRYTYKAI_TRIGGER_MEDIA",
      srcUrl: info.srcUrl || "",
      mediaType: info.mediaType || "image",
    });
    return;
  }
  const kind = info.menuItemId === "krytykai-verify-selection" ? "selection" : "page";
  chrome.tabs.sendMessage(tab.id, { type: "KRYTYKAI_TRIGGER", kind });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "KRYTYKAI_ANALYZE") {
    analyze(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true; // async
  }
  if (msg?.type === "KRYTYKAI_ANALYZE_MEDIA") {
    analyzeMedia(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true; // async
  }
  if (msg?.type === "KRYTYKAI_OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return false;
  }
  if (msg?.type === "KRYTYKAI_ANALYZE_LEARN") {
    analyzeLearn(msg.mode, msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true; // async
  }
  if (msg?.type === "KRYTYKAI_OD_STATUS") {
    onDeviceAvailability()
      .then((availability) => sendResponse({ ok: true, availability }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
  if (msg?.type === "KRYTYKAI_WARMUP") {
    warmUpOnDevice().catch(() => {});
    // nie blokujemy – rozgrzewanie w tle
  }
  // OD_DOWNLOAD_PROGRESS przekazujemy dalej (do popupu/opcji) – nie odpowiadamy.
});

async function analyze({ userQuestion, answerText }) {
  const settings = await loadSettings();
  const trimmed = (answerText || "").slice(0, MAX_INPUT_CHARS);
  const n = settings.numQuestions;

  if (!trimmed.trim()) {
    return { ...heuristicQuestions("", n), source: "heuristic" };
  }

  if (settings.provider === "heuristic") {
    return { ...heuristicQuestions(trimmed, n), source: "heuristic" };
  }

  // Cache – identyczna treść i ustawienia zwracane natychmiast.
  const cacheKey = `${settings.provider}|${n}|${trimmed.length}|${hashStr(userQuestion + "\u0000" + trimmed)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  const system = buildSystemPrompt(n);
  const user = buildUserPrompt({ userQuestion, answerText: trimmed });

  // Model lokalny (Gemini Nano) – bez klucza, prywatnie. Fallback na heurystyki.
  if (settings.provider === "ondevice") {
    try {
      const result = await runOnDevice({
        userQuestion,
        answerText: trimmed.slice(0, MAX_ONDEVICE_CHARS),
        numQuestions: n,
      });
      const out = { ...result, source: "ondevice" };
      cacheSet(cacheKey, out);
      return out;
    } catch (err) {
      return {
        ...heuristicQuestions(trimmed, n),
        source: "heuristic",
        warning: `Model lokalny niedostępny (${String(err?.message || err)}). Pokazuję pytania ogólne – w ustawieniach możesz wybrać Gemini/OpenAI.`,
      };
    }
  }

  // Dostawcy chmurowi – wymagają klucza API.
  if (!settings.apiKey) {
    return {
      ...heuristicQuestions(trimmed, n),
      source: "heuristic",
      warning: "Brak klucza API. Dodaj klucz w ustawieniach albo wybierz model lokalny.",
    };
  }

  try {
    let raw;
    if (settings.provider === "gemini") {
      raw = await callGemini(settings, system, user);
    } else if (settings.provider === "openai") {
      raw = await callOpenAI(settings, system, user);
    } else {
      throw new Error("Nieznany dostawca");
    }
    const parsed = parseModelJson(raw);
    const out = { ...parsed, source: settings.provider };
    cacheSet(cacheKey, out);
    return out;
  } catch (err) {
    return {
      ...heuristicQuestions(trimmed, n),
      source: "heuristic",
      warning: `Błąd API (${settings.provider}): ${String(err?.message || err)}. Pokazuję pytania ogólne.`,
    };
  }
}

// --- Analiza mediów (obraz / klatka wideo) --------------------------------
async function analyzeMedia(payload) {
  const settings = await loadSettings();
  const n = settings.numQuestions;
  const context = (payload.context || "").slice(0, 2000);

  // Modele wizyjne wymagają dostawcy chmurowego z kluczem (Nano nie widzi obrazów).
  const canVision =
    (settings.provider === "gemini" || settings.provider === "openai") && settings.apiKey;

  if (!canVision) {
    const base = heuristicQuestions(context, n);
    return {
      ...base,
      source: "heuristic",
      warning:
        "Analiza samego obrazu wymaga Gemini lub OpenAI z kluczem API (w ustawieniach). Oceniam tylko tekst wokół mediów — skorzystaj też z wyszukiwania wstecznego poniżej.",
    };
  }

  let inline;
  try {
    if (payload.dataUrl) inline = dataUrlToInline(payload.dataUrl);
    else inline = await fetchImageInline(payload.srcUrl);
  } catch (err) {
    const base = heuristicQuestions(context, n);
    return {
      ...base,
      source: "heuristic",
      warning: `Nie udało się pobrać mediów (${String(
        err?.message || err
      )}). Oceniam po opisie; użyj wyszukiwania wstecznego poniżej.`,
    };
  }

  const system = buildMediaSystemPrompt(n);
  const user = buildMediaUserPrompt({ context, mediaType: payload.mediaType });

  try {
    let raw;
    if (settings.provider === "gemini") {
      raw = await callGeminiVision(settings, system, user, inline);
    } else {
      raw = await callOpenAIVision(settings, system, user, inline);
    }
    const parsed = parseModelJson(raw);
    return { ...parsed, source: settings.provider, media: true };
  } catch (err) {
    const base = heuristicQuestions(context, n);
    return {
      ...base,
      source: "heuristic",
      warning: `Błąd analizy mediów (${settings.provider}): ${String(
        err?.message || err
      )}.`,
    };
  }
}

function dataUrlToInline(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (!m) throw new Error("Nieprawidłowy dataURL klatki");
  return { mime: m[1], data: m[2] };
}

async function fetchImageInline(url) {
  if (!url) throw new Error("Brak adresu mediów");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_MEDIA_BYTES) {
    throw new Error("Plik zbyt duży (limit 6 MB)");
  }
  let mime = res.headers.get("Content-Type") || "image/jpeg";
  mime = mime.split(";")[0].trim();
  if (!/^image\//.test(mime)) mime = "image/jpeg";
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return { mime, data: btoa(binary) };
}

async function callGeminiVision(settings, system, user, inline) {
  const model = settings.geminiModel || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    settings.apiKey
  )}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: user },
          { inline_data: { mime_type: inline.mime, data: inline.data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };
  const res = await geminiFetch(url, body);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function callOpenAIVision(settings, system, user, inline) {
  const model = settings.openaiModel || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            {
              type: "image_url",
              image_url: { url: `data:${inline.mime};base64,${inline.data}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// --- Tryby uczące: My Story AI / Linglerno AI ------------------------------
const LEARN_OUTPUT_TOKENS = 1100;

async function analyzeLearn(mode, payload) {
  const settings = await loadSettings();
  const answerText = (payload?.answerText || "").slice(0, MAX_INPUT_CHARS);
  if (!answerText.trim()) {
    throw new Error("Brak treści do analizy.");
  }

  const profile = settings.profile || {};

  // Model wbudowany (Gemini Nano) – bez klucza, prywatnie. Działa najlepiej po
  // angielsku; przy innych językach (zwłaszcza Linglerno) jakość bywa niższa.
  if (settings.provider === "ondevice") {
    try {
      const result = await runOnDeviceLearn({
        mode,
        profile,
        answerText: answerText.slice(0, MAX_ONDEVICE_CHARS),
      });
      return { ...result, mode, source: "ondevice" };
    } catch (err) {
      return {
        needCloud: true,
        warning: `Model lokalny nie poradził sobie z tym trybem (${String(
          err?.message || err
        )}). Wybierz Gemini lub OpenAI z kluczem API w ustawieniach.`,
      };
    }
  }

  // Heurystyka nie ma modelu językowego – tryby uczące wymagają chmury z kluczem.
  const canCloud =
    (settings.provider === "gemini" || settings.provider === "openai") && settings.apiKey;
  if (!canCloud) {
    return {
      needCloud: true,
      warning:
        "Ten tryb wymaga modelu z kluczem API (Gemini lub OpenAI) albo modelu wbudowanego. Ustaw go w opcjach rozszerzenia.",
    };
  }

  let system, user;
  if (mode === "lingo") {
    system = buildLingoSystemPrompt(profile);
    user = buildLingoUserPrompt(profile, answerText);
  } else {
    system = buildStorySystemPrompt();
    user = buildStoryUserPrompt(profile, answerText);
  }

  const raw =
    settings.provider === "gemini"
      ? await callGeminiJSON(settings, system, user, LEARN_OUTPUT_TOKENS)
      : await callOpenAIJSON(settings, system, user, LEARN_OUTPUT_TOKENS);
  const parsed = parseLooseJson(raw);
  return { ...parsed, mode, source: settings.provider };
}

async function runOnDeviceLearn(payload) {
  await ensureOffscreen();
  const resp = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "OD_ANALYZE_LEARN",
    payload,
  });
  if (!resp?.ok) throw new Error(resp?.error || "Nieznany błąd modelu lokalnego");
  return resp.result;
}

async function callGeminiJSON(settings, system, user, maxTokens) {
  const model = settings.geminiModel || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    settings.apiKey
  )}`;
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.6,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
    },
  };
  const res = await geminiFetch(url, body);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function callOpenAIJSON(settings, system, user, maxTokens) {
  const model = settings.openaiModel || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// --- Offscreen document dla wbudowanego modelu -----------------------------
let creatingOffscreen = null;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: "src/offscreen/offscreen.html",
      reasons: ["WORKERS"],
      justification:
        "Uruchamianie wbudowanego modelu AI (Prompt API / Gemini Nano), który nie działa w service workerze.",
    });
  }
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

async function runOnDevice(payload) {
  await ensureOffscreen();
  const resp = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "OD_ANALYZE",
    payload,
  });
  if (!resp?.ok) throw new Error(resp?.error || "Nieznany błąd modelu lokalnego");
  return resp.result;
}

async function onDeviceAvailability() {
  await ensureOffscreen();
  const resp = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "OD_AVAILABILITY",
  });
  if (!resp?.ok) throw new Error(resp?.error || "Nie udało się sprawdzić dostępności");
  return resp.availability;
}

async function warmUpOnDevice() {
  const settings = await loadSettings();
  if (settings.provider !== "ondevice") return;
  await ensureOffscreen();
  await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "OD_WARMUP",
    numQuestions: settings.numQuestions,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST do Gemini z ponawianiem przy błędach przejściowych (429/500/503).
async function geminiFetch(url, body, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res;
    const text = await safeText(res);
    lastErr = new Error(`HTTP ${res.status}: ${text}`);
    const transient = res.status === 503 || res.status === 429 || res.status === 500;
    if (transient && i < attempts - 1) {
      await sleep(700 * Math.pow(2, i)); // 0.7s, 1.4s…
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

async function callGemini(settings, system, user) {
  const model = settings.geminiModel || "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    settings.apiKey
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
  const res = await geminiFetch(url, body);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return text;
}

async function callOpenAI(settings, system, user) {
  const model = settings.openaiModel || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "brak treści błędu";
  }
}
