// Cloudflare Worker – proxy do Gemini.
// Klucz API trzymany jest jako sekret (env.GEMINI_API_KEY), nigdy nie trafia do klienta.
//
// Wdrożenie: patrz backend/README.md
// Endpoint:  POST /  { answerText, userQuestion?, numQuestions? }
//            GET  /health -> "ok"

import {
  buildSystemPrompt,
  buildUserPrompt,
  parseModelJson,
  parseLooseJson,
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  buildLingoSystemPrompt,
  buildLingoUserPrompt,
} from "./prompt.js";

const MAX_INPUT_CHARS = 8000;
const MAX_OUTPUT_TOKENS = 700;
const LEARN_OUTPUT_TOKENS = 1100;
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

// Limity (ochrona Twojego klucza). Wymaga bindingu KV o nazwie RATE_LIMIT (opcjonalnie).
const RL_PER_MINUTE = 12; // maks. zapytań na IP na minutę
const RL_PER_DAY = 200; // maks. zapytań na IP na dobę

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function rateLimit(env, ip) {
  if (!env.RATE_LIMIT || !ip) return { ok: true };
  const now = new Date();
  const minKey = `m:${ip}:${now.getUTCHours()}:${now.getUTCMinutes()}`;
  const dayKey = `d:${ip}:${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

  const [minRaw, dayRaw] = await Promise.all([
    env.RATE_LIMIT.get(minKey),
    env.RATE_LIMIT.get(dayKey),
  ]);
  const minCount = parseInt(minRaw || "0", 10);
  const dayCount = parseInt(dayRaw || "0", 10);

  if (minCount >= RL_PER_MINUTE) return { ok: false, retry: 60 };
  if (dayCount >= RL_PER_DAY) return { ok: false, retry: 3600 };

  await Promise.all([
    env.RATE_LIMIT.put(minKey, String(minCount + 1), { expirationTtl: 120 }),
    env.RATE_LIMIT.put(dayKey, String(dayCount + 1), { expirationTtl: 90000 }),
  ]);
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return new Response("ok", { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "Server not configured (missing GEMINI_API_KEY)" }, 500, origin);
    }

    // Rate limiting
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const rl = await rateLimit(env, ip);
    if (!rl.ok) {
      return json(
        { error: "Rate limit exceeded. Try again later.", retryAfter: rl.retry },
        429,
        origin
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin);
    }

    const answerText = String(payload.answerText || "").slice(0, MAX_INPUT_CHARS);
    if (!answerText.trim()) {
      return json({ error: "answerText is required" }, 400, origin);
    }
    const userQuestion = String(payload.userQuestion || "").slice(0, 1000);
    let numQuestions = parseInt(payload.numQuestions, 10);
    if (isNaN(numQuestions)) numQuestions = 4;
    numQuestions = Math.min(7, Math.max(1, numQuestions));

    const model = env.GEMINI_MODEL || DEFAULT_MODEL;
    const mode = String(payload.mode || "factcheck");
    const language = String(payload.language || "").slice(0, 5);
    const profile =
      payload.profile && typeof payload.profile === "object" ? payload.profile : {};

    let system, user;
    let maxTokens = MAX_OUTPUT_TOKENS;
    let loose = false;
    if (mode === "story") {
      system = buildStorySystemPrompt(language);
      user = buildStoryUserPrompt(profile, answerText);
      maxTokens = LEARN_OUTPUT_TOKENS;
      loose = true;
    } else if (mode === "lingo") {
      system = buildLingoSystemPrompt(profile, language);
      user = buildLingoUserPrompt(profile, answerText);
      maxTokens = LEARN_OUTPUT_TOKENS;
      loose = true;
    } else {
      system = buildSystemPrompt(numQuestions, language);
      user = buildUserPrompt({ userQuestion, answerText });
    }

    const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
        maxOutputTokens: maxTokens,
      },
    };

    let res;
    try {
      res = await fetch(gUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return json({ error: "Upstream request failed" }, 502, origin);
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return json({ error: `Gemini error ${res.status}`, detail }, 502, origin);
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

    let parsed;
    try {
      parsed = loose ? parseLooseJson(text) : parseModelJson(text);
    } catch (e) {
      return json({ error: "Could not parse model output" }, 502, origin);
    }

    return json(parsed, 200, origin);
  },
};
