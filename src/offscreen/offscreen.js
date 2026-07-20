import {
  buildSystemPrompt,
  buildUserPrompt,
  parseModelJson,
  parseLooseJson,
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  buildLingoSystemPrompt,
  buildLingoUserPrompt,
} from "../shared/prompt.js";

// Wyciszenie nieszkodliwych ostrzeżeń wbudowanego modelu (np. o nieobsługiwanym
// języku polskim), które inaczej zaśmiecają panel błędów rozszerzenia.
// Prawdziwe błędy przechodzą dalej bez zmian.
const BENIGN_PATTERNS = [
  /output language/i,
  /untested language/i,
  /language.*(should be specified|not.*supported)/i,
  /supported (output )?language/i,
  /specify.*language/i,
];
function isBenign(args) {
  const text = args.map((a) => String(a?.message ?? a)).join(" ");
  return BENIGN_PATTERNS.some((re) => re.test(text));
}
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);
console.warn = (...args) => {
  if (!isBenign(args)) _origWarn(...args);
};
console.error = (...args) => {
  if (!isBenign(args)) _origError(...args);
};
self.addEventListener("unhandledrejection", (e) => {
  if (isBenign([e.reason])) e.preventDefault();
});

// Schemat wymuszający strukturę odpowiedzi (responseConstraint).
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    assessment: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["fact", "opinion", "clickbait", "mixed", "uncertain"] },
        risk: { type: "string", enum: ["low", "medium", "high"] },
        note: { type: "string" },
      },
      required: ["type", "risk", "note"],
    },
    summary: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          why: { type: "string" },
          kind: { type: "string", enum: ["verify", "explore"] },
        },
        required: ["q", "why"],
      },
    },
  },
  required: ["assessment", "summary", "questions"],
};

// Schematy dla trybów uczących (My Story / Linglerno).
const STORY_SCHEMA = {
  type: "object",
  properties: {
    takeaways: { type: "array", items: { type: "string" } },
    learn_next: {
      type: "array",
      items: {
        type: "object",
        properties: { topic: { type: "string" }, why: { type: "string" } },
        required: ["topic"],
      },
    },
    read_next: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, why: { type: "string" } },
        required: ["title"],
      },
    },
    lesson: { type: "string" },
  },
  required: ["takeaways", "lesson"],
};

const LINGO_SCHEMA = {
  type: "object",
  properties: {
    summary_target: { type: "string" },
    summary_native: { type: "string" },
    vocab: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          translation: { type: "string" },
          example: { type: "string" },
        },
        required: ["term", "translation"],
      },
    },
    phrases: {
      type: "array",
      items: {
        type: "object",
        properties: { phrase: { type: "string" }, translation: { type: "string" } },
        required: ["phrase", "translation"],
      },
    },
    culture: { type: "string" },
  },
  required: ["summary_target", "vocab"],
};

function hasPromptApi() {
  return typeof self !== "undefined" && "LanguageModel" in self;
}

async function checkAvailability() {
  if (!hasPromptApi()) return "unavailable";
  try {
    return await self.LanguageModel.availability();
  } catch {
    return "unavailable";
  }
}

// Podtrzymujemy jedną „ciepłą" sesję bazową z promptem systemowym i klonujemy ją
// na każde zapytanie – tworzenie sesji od zera przy każdej analizie jest wolne.
let baseSession = null;
let baseSessionN = null;

async function ensureBaseSession(numQuestions) {
  if (baseSession && baseSessionN === numQuestions) return baseSession;
  if (baseSession) {
    try { baseSession.destroy(); } catch {}
    baseSession = null;
  }
  const system = buildSystemPrompt(numQuestions);
  // Prompt API wspiera tylko de/en/es/fr/ja. Deklarujemy "en" (unikamy ostrzeżenia
  // i NotSupportedError), a o polski prosimy w treści promptu.
  baseSession = await self.LanguageModel.create({
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
    initialPrompts: [{ role: "system", content: system }],
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        chrome.runtime
          .sendMessage({ type: "OD_DOWNLOAD_PROGRESS", loaded: e.loaded })
          .catch(() => {});
      });
    },
  });
  baseSessionN = numQuestions;
  return baseSession;
}

async function warmUp(numQuestions) {
  if (!hasPromptApi()) return;
  const availability = await self.LanguageModel.availability();
  if (availability === "unavailable") return;
  await ensureBaseSession(numQuestions || 4);
}

async function analyzeOnDevice({ userQuestion, answerText, numQuestions }) {
  if (!hasPromptApi()) {
    throw new Error("Prompt API niedostępne w tej wersji Chrome.");
  }
  const availability = await self.LanguageModel.availability();
  if (availability === "unavailable") {
    throw new Error("Model lokalny niedostępny na tym urządzeniu.");
  }

  const user = buildUserPrompt({ userQuestion, answerText });
  const base = await ensureBaseSession(numQuestions);
  // Klon dziedziczy prompt systemowy i jest tani; izoluje kontekst pojedynczej analizy.
  const session = await base.clone();

  try {
    let raw;
    try {
      // omitResponseConstraintInput: schemat nie jest doklejany do wejścia (mniej tokenów, szybciej).
      raw = await session.prompt(user, {
        responseConstraint: RESPONSE_SCHEMA,
        omitResponseConstraintInput: true,
      });
    } catch {
      // Starsze wersje bez responseConstraint – próba bez ograniczenia.
      raw = await session.prompt(user);
    }
    return parseModelJson(raw);
  } finally {
    session.destroy();
  }
}

// Tryby uczące na modelu wbudowanym. Osobna sesja per zapytanie (prompt zależy
// od profilu i trybu), więc nie podtrzymujemy sesji bazowej jak przy fact-checku.
async function analyzeLearnOnDevice({ mode, profile, answerText }) {
  if (!hasPromptApi()) {
    throw new Error("Prompt API niedostępne w tej wersji Chrome.");
  }
  const availability = await self.LanguageModel.availability();
  if (availability === "unavailable") {
    throw new Error("Model lokalny niedostępny na tym urządzeniu.");
  }

  const isLingo = mode === "lingo";
  const system = isLingo ? buildLingoSystemPrompt(profile) : buildStorySystemPrompt();
  const user = isLingo
    ? buildLingoUserPrompt(profile, answerText)
    : buildStoryUserPrompt(profile, answerText);
  const schema = isLingo ? LINGO_SCHEMA : STORY_SCHEMA;

  const session = await self.LanguageModel.create({
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
    initialPrompts: [{ role: "system", content: system }],
  });
  try {
    let raw;
    try {
      raw = await session.prompt(user, {
        responseConstraint: schema,
        omitResponseConstraintInput: true,
      });
    } catch {
      raw = await session.prompt(user);
    }
    return parseLooseJson(raw);
  } finally {
    session.destroy();
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return; // ignoruj wiadomości nie dla nas

  if (msg.type === "OD_AVAILABILITY") {
    checkAvailability()
      .then((availability) => sendResponse({ ok: true, availability }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (msg.type === "OD_ANALYZE") {
    analyzeOnDevice(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (msg.type === "OD_ANALYZE_LEARN") {
    analyzeLearnOnDevice(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }

  if (msg.type === "OD_WARMUP") {
    warmUp(msg.numQuestions)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err) }));
    return true;
  }
});
