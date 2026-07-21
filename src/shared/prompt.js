// Budowanie promptu dla LLM oraz heurystyczny tryb awaryjny (bez klucza API).

// Nazwy języków dla wymuszenia języka odpowiedzi (język aplikacji wybrany przez użytkownika).
const LANG_NAMES = { pl: "Polish", en: "English", es: "Spanish", de: "German", fr: "French" };
export function langName(code) {
  return LANG_NAMES[String(code || "").toLowerCase().slice(0, 2)] || null;
}

export function buildSystemPrompt(numQuestions, language) {
  const today = new Date().toISOString().slice(0, 10);
  const ln = langName(language);
  const langLine = ln
    ? `CRITICAL LANGUAGE RULE: Write the summary, the assessment note, and ALL questions ONLY in ${ln}. This is mandatory REGARDLESS of the language of the analyzed content — even if the content is in another language, your output text MUST be in ${ln}. Do NOT answer in English unless ${ln} is English.`
    : "IMPORTANT: First DETECT the language of the analyzed content. Write the summary, the assessment note, and ALL questions in that SAME language (whatever language the content is in).";
  const outLang = ln || "the content language";
  const reminder = ln
    ? `FINAL REMINDER: every human-readable string (summary, note, each question's "q" and "why") MUST be written in ${ln}.`
    : "";
  return [
    "You are a critical fact-checking and credibility-assessment assistant.",
    "You will receive some content (an AI chat answer, a news article, or a snippet), optionally with the user's question.",
    "",
    `TODAY'S DATE is ${today}. Treat this as the current date. Dates on or before today are NOT in the future.`,
    "Do NOT raise risk merely because a year looks recent or is the current year — the current year is normal, not 'outdated' or 'future'. Only flag a date as future/outdated if it is genuinely after today or clearly stale for the claim.",
    "",
    langLine,
    "",
    "Do THREE things:",
    "",
    "1) CREDIBILITY ASSESSMENT. Return an 'assessment' object with:",
    '   - "type": one of "fact" (concrete, verifiable, neutral tone), "opinion",',
    '     "clickbait" (sensational/emotional/baiting), "mixed", "uncertain".',
    '   - "risk": risk of disinformation or manipulation: "low" | "medium" | "high".',
    "     Raise risk for: emotional/sensational language, missing sources, exaggeration, vague",
    "     generalities, politically charged claims, clickbait phrasing. Lower it for concrete,",
    "     verifiable facts (e.g. sports results, data, dates, events, neutral tone).",
    `   - "note": one sentence justifying the assessment, written in ${outLang}.`,
    "",
    "2) QUESTIONS — MATCH THEIR CHARACTER TO THE ASSESSMENT:",
    '   - If risk = "high" or type = "clickbait"/"opinion": give EXACTLY 2 sharp VERIFICATION',
    '     questions (kind: "verify") that help check truthfulness and expose manipulation.',
    `   - If risk = "low" and type = "fact": give ${numQuestions} deeper CURIOSITY/EXPLORATION`,
    '     questions (kind: "explore") to learn more about the topic (e.g. for a sports result –',
    "     more about the athlete's achievements, records, historical context).",
    `   - Otherwise ("medium"): mix verification and exploration questions, up to ${numQuestions} total.`,
    "",
    "3) FLAGS — dubious fragments. Return \"flags\": an array (0 to 3 items) of objects",
    '   {"quote": "...", "why": "..."} where "quote" is copied VERBATIM (an exact substring,',
    "   a single sentence or short phrase) from the analyzed content — a claim that is",
    "   manipulative, unsupported, or needs verification. Copy the quote EXACTLY as written in",
    `   the ORIGINAL language of the content (do NOT translate the quote). Write "why" in ${outLang}.`,
    "   If nothing is dubious (e.g. low risk / plain fact), return an empty array.",
    "",
    `Each question (in ${outLang}): {"q": "...", "why": "one sentence why", "kind": "verify"|"explore"}.`,
    "Return ONLY valid JSON in this exact shape:",
    '{"assessment": {"type": "...", "risk": "...", "note": "..."}, "summary": "one sentence", "questions": [{"q": "...", "why": "...", "kind": "..."}], "flags": [{"quote": "...", "why": "..."}]}',
    "No text outside the JSON, no markdown fences.",
    reminder,
  ].filter(Boolean).join("\n");
}

export function buildUserPrompt({ userQuestion, answerText }) {
  const parts = [];
  if (userQuestion) parts.push(`USER'S QUESTION:\n${userQuestion}\n`);
  parts.push(`CONTENT TO ANALYZE:\n${answerText}`);
  return parts.join("\n");
}

// Prompt do oceny autentyczności obrazu/klatki wideo (multimodalny).
export function buildMediaSystemPrompt(numQuestions, language) {
  const today = new Date().toISOString().slice(0, 10);
  const ln = langName(language);
  const langLine = ln
    ? `IMPORTANT: Write the note, summary and questions in ${ln}, regardless of the context language.`
    : "IMPORTANT: Detect the language of the context; write the note, summary and questions in that language. If the context is empty, use Polish.";
  return [
    "You are a media authenticity assistant. You receive an IMAGE (a photo or a single frame",
    "extracted from a video) and optional surrounding text/context from a web page.",
    "",
    `TODAY'S DATE is ${today}. Dates on or before today are NOT in the future; do not flag the current year as suspicious.`,
    "",
    "Assess how likely the media is AI-generated, deepfaked, edited or misleadingly presented.",
    "CRITICAL: You are NOT a certified detector. Never claim certainty. Be cautious and explain",
    "the VISIBLE signals you reason from: faces, eyes/blinking, teeth, hands and fingers, skin texture,",
    "lighting/shadows consistency, warped backgrounds, garbled text/logos, and physically impossible",
    "scenarios (e.g. a person talking to a younger version of themselves is inherently synthetic).",
    "",
    langLine,
    "",
    "Return an 'assessment' object with:",
    '   - "type": one of "authentic", "ai_generated", "deepfake", "edited", "misleading_context", "uncertain".',
    '   - "risk": risk that the media is fake/manipulated/misleading: "low" | "medium" | "high".',
    '   - "note": one sentence justifying the assessment, in the context language.',
    "",
    `Also give up to ${numQuestions} concrete questions/steps (kind: "verify") that help the user`,
    "check it (reverse image search, look for the original/official source, check date and place,",
    "look for other angles, ask who first posted it).",
    "",
    "Return ONLY valid JSON in this exact shape:",
    '{"assessment": {"type": "...", "risk": "...", "note": "..."}, "summary": "one sentence", "questions": [{"q": "...", "why": "...", "kind": "verify"}]}',
    "No text outside the JSON, no markdown fences.",
  ].join("\n");
}

export function buildMediaUserPrompt({ context, mediaType }) {
  const kind = mediaType === "video" ? "a frame extracted from a video" : "an image";
  const ctx = (context || "").trim();
  return [
    `The attached media is ${kind}.`,
    ctx ? `Surrounding context from the web page:\n"""\n${ctx}\n"""` : "There is no useful surrounding text.",
    "Analyze the attached image and return the JSON described in the instructions.",
  ].join("\n");
}

// Deterministyczny PRNG (mulberry32) – ta sama treść daje stabilną kolejność,
// różne treści różnią się rotacją puli.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const rand = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Lekka detekcja języka treści (dla trybu offline). Zwraca kod obsługiwanej puli.
// Ścieżka modelowa (Gemini/OpenAI/Nano) wykrywa język sama – to tylko fallback.
function detectLang(text) {
  const t = text.toLowerCase();
  if (/[ąćęłńóśźż]/.test(t) || /\b(jest|nie|się|że|czy|oraz|który)\b/.test(t)) return "pl";
  // Domyślnie angielski (uniwersalny fallback dla pozostałych języków w trybie offline).
  return "en";
}

// Dwujęzyczne pule pytań. Klucz = kod języka; brakujący język spada na "en".
const VERIFICATION_POOL = {
  en: [
    { q: "Which credible, independent sources confirm this information?", why: "Missing sources are the top signal of possible disinformation.", kind: "verify" },
    { q: "Is the headline or claim exaggerated compared with the actual content?", why: "Clickbait often promises more than the text delivers.", kind: "verify" },
    { q: "Who is the author or publisher and what interest might they have?", why: "The source's motivation affects objectivity.", kind: "verify" },
    { q: "Do other independent outlets report the same, or does it appear only here?", why: "An isolated sensation is often untrue.", kind: "verify" },
    { q: "What emotions is this text meant to trigger, and could they be manipulative?", why: "Strong emotional charge often replaces facts.", kind: "verify" },
    { q: "Are concrete data, dates and names given, or only vague generalities?", why: "Vagueness makes claims hard to verify.", kind: "verify" },
  ],
  pl: [
    { q: "Jakie wiarygodne, niezależne źródła potwierdzają tę informację?", why: "Brak źródeł to główny sygnał możliwej dezinformacji.", kind: "verify" },
    { q: "Czy nagłówek lub teza nie są wyolbrzymione względem faktów w treści?", why: "Clickbait często obiecuje więcej, niż wynika z treści.", kind: "verify" },
    { q: "Kto jest autorem lub wydawcą i jaki może mieć w tym interes?", why: "Motywacja nadawcy wpływa na obiektywizm przekazu.", kind: "verify" },
    { q: "Czy inne, niezależne media podają to samo, czy pojawia się to tylko tutaj?", why: "Odosobniona sensacja bywa nieprawdziwa.", kind: "verify" },
    { q: "Jakie emocje ma wywołać ten tekst i czy nie służą one manipulacji?", why: "Silny ładunek emocjonalny często zastępuje fakty.", kind: "verify" },
    { q: "Czy podano konkretne dane, daty i nazwiska, czy tylko ogólniki?", why: "Ogólniki utrudniają weryfikację i sprzyjają manipulacji.", kind: "verify" },
  ],
};

const CURIOSITY_POOL = {
  en: [
    { q: "What are the key facts, numbers and records related to this topic?", why: "Helps you understand the topic more deeply.", kind: "explore" },
    { q: "How does this event or result compare historically?", why: "Historical context gives facts meaning.", kind: "explore" },
    { q: "Who else was involved and what role did they play?", why: "Broadens the picture with key figures.", kind: "explore" },
    { q: "What earlier, similar events or achievements happened before?", why: "Shows continuity and comparisons.", kind: "explore" },
    { q: "What happened right before and right after this?", why: "Builds a fuller timeline.", kind: "explore" },
    { q: "Where can I find more details, statistics and trivia about this?", why: "Points you toward deeper reading.", kind: "explore" },
  ],
  pl: [
    { q: "Jakie najważniejsze fakty, liczby i rekordy wiążą się z tym tematem?", why: "Pozwala poznać temat głębiej.", kind: "explore" },
    { q: "Jak to wydarzenie lub wynik wypada na tle historycznym?", why: "Kontekst historyczny nadaje znaczenie faktom.", kind: "explore" },
    { q: "Kto jeszcze był w to zaangażowany i jaką odegrał rolę?", why: "Rozszerza obraz o kluczowe postacie.", kind: "explore" },
    { q: "Jakie były wcześniejsze, podobne wydarzenia lub osiągnięcia?", why: "Pokazuje ciągłość i porównania.", kind: "explore" },
    { q: "Co wydarzyło się bezpośrednio przed tym i tuż po tym?", why: "Buduje pełniejszą oś czasu.", kind: "explore" },
    { q: "Gdzie znajdę więcej szczegółów, statystyk i ciekawostek na ten temat?", why: "Wskazuje kierunek dalszego zgłębiania.", kind: "explore" },
  ],
};

// Uzasadnienia oceny i podsumowania per język (kanoniczne enumy są po angielsku).
const NOTES = {
  en: {
    clickbait: "The content shows signs of sensational/baiting language (emotions, exaggeration) – verify carefully.",
    opinion: "The content reads like an opinion/judgement rather than a neutral account of facts.",
    fact: "The content looks concrete and verifiable (data, results, dates) – low disinformation risk.",
    mixed: "The content has some sensational signals – worth checking the key claims.",
    uncertain: "Hard to classify this content – apply normal caution.",
    sumRisky: "Potentially unreliable content – here are 2 questions to help verify it.",
    sumFact: "The information looks reliable – here are questions to learn more.",
    sumMixed: "Ambiguous content – we combine verification with exploration questions.",
  },
  pl: {
    clickbait: "Treść ma cechy sensacyjnego/chwytliwego przekazu (emocje, wyolbrzymienia) – wymaga ostrożnej weryfikacji.",
    opinion: "Treść brzmi jak opinia/ocena, a nie neutralny opis faktów.",
    fact: "Treść wygląda na konkretną i weryfikowalną (dane, wyniki, daty) – niskie ryzyko dezinformacji.",
    mixed: "Treść zawiera pojedyncze sygnały sensacyjności – warto sprawdzić kluczowe twierdzenia.",
    uncertain: "Trudno jednoznacznie ocenić charakter treści – zachowaj zwykłą ostrożność.",
    sumRisky: "Treść potencjalnie niepewna – poniżej 2 pytania, które pomogą zweryfikować jej prawdziwość.",
    sumFact: "Informacja wygląda na rzetelną – poniżej pytania, które pozwolą dowiedzieć się więcej.",
    sumMixed: "Treść niejednoznaczna – łączymy pytania weryfikujące z pogłębiającymi.",
  },
};

// Lekka klasyfikacja treści bez modelu – sygnały językowe (PL + EN + interpunkcja).
function classifyContent(text) {
  const t = text.toLowerCase();
  let clickbait = 0;

  if (/\b(szok|szokując|nie uwierzysz|musisz to zobaczyć|sensacj|skandal|masakra|dramat|wstrząsając|niewiarygodn|zobacz co|to koniec|załamał|hit sieci|internauci w szoku)\b/.test(t)) clickbait += 2;
  if (/\b(shock(ing)?|you won'?t believe|unbelievable|jaw-dropping|will blow your mind|gone wrong|this is why|what happened next|insane|outrage)\b/.test(t)) clickbait += 2;
  if (/!{2,}|\?{2,}/.test(text)) clickbait += 1;
  if (/\b(uwaga|pilne|breaking|tylko u nas|wyciekł|ujawniamy|exclusive|leaked|urgent)\b/.test(t)) clickbait += 1;
  const capsWords = (text.match(/\b[A-ZĄĆĘŁŃÓŚŹŻ]{4,}\b/g) || []).length;
  if (capsWords >= 3) clickbait += 1;

  const opinion =
    /\b(moim zdaniem|uważam|wydaje mi się|sądzę|prawdopodobnie|chyba|zapewne|należy|powinno się|to skandal|to hańba)\b/.test(t) ||
    /\b(i think|in my opinion|i believe|probably|arguably|should|ought to|it'?s a disgrace|clearly the best)\b/.test(t);

  let factual = 0;
  if (/\b\d+\s?[:\-]\s?\d+\b/.test(text)) factual += 2; // wynik typu 3:1
  if (/\b(wynik|mecz|wygrał|przegrał|pokonał|zdobył|rekord|sezon|liga|mistrzostw|turniej|finał|gol|punkt|tytuł|set|runda)\b/.test(t)) factual += 2;
  if (/\b(score|match|won|lost|defeated|record|season|league|championship|tournament|final|goal|points|title|round|set)\b/.test(t)) factual += 2;
  if (/\b(19|20)\d{2}\b/.test(text)) factual += 1;
  if (/\d/.test(text)) factual += 1;

  if (clickbait >= 2) return { type: "clickbait", risk: "high" };
  if (opinion && factual < 2) return { type: "opinion", risk: "medium" };
  if (factual >= 3 && clickbait === 0) return { type: "fact", risk: "low" };
  if (clickbait === 1) return { type: "mixed", risk: "medium" };
  return { type: "uncertain", risk: "medium" };
}

// Tryb awaryjny bez API – ocenia charakter treści, wykrywa język i dobiera pytania:
// ostre weryfikujące dla treści ryzykownych, pogłębiające dla rzetelnych faktów.
export function heuristicQuestions(answerText, numQuestions) {
  const text = (answerText || "").toString();
  const lang = detectLang(text);
  const L = NOTES[lang] || NOTES.en;
  const verify = VERIFICATION_POOL[lang] || VERIFICATION_POOL.en;
  const curiosity = CURIOSITY_POOL[lang] || CURIOSITY_POOL.en;

  const { type, risk } = classifyContent(text);
  const assessment = { type, risk, note: L[type] || L.uncertain };
  const seed = (text.length * 2654435761) ^ 0x9e3779b9;

  const seen = new Set();
  const picked = [];
  const add = (item) => {
    if (item && !seen.has(item.q)) {
      seen.add(item.q);
      picked.push(item);
    }
  };

  let limit = numQuestions;
  let summary;

  if (risk === "high" || type === "clickbait" || type === "opinion") {
    limit = 2;
    seededShuffle(verify, seed).forEach(add);
    summary = L.sumRisky;
  } else if (risk === "low" && type === "fact") {
    seededShuffle(curiosity, seed).forEach(add);
    summary = L.sumFact;
  } else {
    seededShuffle(verify, seed).slice(0, 2).forEach(add);
    seededShuffle(curiosity, seed).forEach(add);
    summary = L.sumMixed;
  }

  return { assessment, summary, questions: picked.slice(0, limit) };
}

// Wyciąga JSON nawet gdy model owinie go w ```json ... ```
export function parseModelJson(text) {
  if (!text) throw new Error("Pusta odpowiedź modelu");
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  const parsed = JSON.parse(t);
  if (!Array.isArray(parsed.questions)) throw new Error("Brak pola questions");
  return parsed;
}

// Parser JSON bez wymogu pola „questions" (dla My Story / Linglerno).
export function parseLooseJson(text) {
  if (!text) throw new Error("Pusta odpowiedź modelu");
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

// ---------- Prompty trybów uczących ----------
function profileBlock(p) {
  const lines = [];
  if (p.role) lines.push(`Role/position: ${String(p.role).slice(0, 200)}`);
  if (p.industry) lines.push(`Industry/field: ${String(p.industry).slice(0, 200)}`);
  if (p.goals) lines.push(`Learning goals: ${String(p.goals).slice(0, 400)}`);
  if (p.skills) lines.push(`Skills to develop: ${String(p.skills).slice(0, 300)}`);
  if (p.interests) lines.push(`Interests: ${String(p.interests).slice(0, 300)}`);
  return lines.length ? lines.join("\n") : "(no profile provided)";
}

export function buildStorySystemPrompt(language) {
  const ln = langName(language);
  const langLine = ln
    ? `Write EVERYTHING (takeaways, topics, reasons, lesson) in ${ln}, regardless of the language of the content.`
    : "Detect the language of the content and write everything in that language (if unclear, use the profile/native language).";
  return [
    "You are a personal growth & learning coach. The user gives you something they just read",
    "(an article, a post, an AI answer) plus their PROFILE (career, goals, skills, interests).",
    "",
    "Turn what they read into concrete personal value. Be specific and actionable — NO vague fluff.",
    `Connect ideas to THEIR field, role and goals. ${langLine}`,
    "Keep it SHORT and focused — quality over quantity, do not overwhelm the user.",
    "",
    "For read_next: give a search QUERY (a topic, skill or well-known course subject) the user can",
    "look up — do NOT invent specific article titles, URLs, authors or book names (avoid hallucination).",
    "",
    "Return ONLY valid JSON in this exact shape:",
    "{",
    '  "takeaways": ["2-3 concrete ways to use this in their work/field"],',
    '  "read_next": [{"query": "a short search query / topic to explore next", "why": "one sentence"}],',
    '  "lesson": "a short 2-3 sentence micro-lesson that teaches the key concept from the content"',
    "}",
    "EXACTLY 2 items in read_next. Keep takeaways to 2-3. No text outside JSON, no markdown fences.",
  ].join("\n");
}

export function buildStoryUserPrompt(profile, content) {
  return [
    "USER PROFILE:",
    profileBlock(profile || {}),
    "",
    "CONTENT THEY JUST READ:",
    '"""',
    (content || "").slice(0, 6000),
    '"""',
  ].join("\n");
}

export function buildLingoSystemPrompt(profile, language) {
  const p = profile || {};
  const native = p.nativeLang || langName(language) || "the user's language";
  const target = p.targetLang || "English";
  const level = p.level || "A2";
  const country = p.country || "a country where the language is spoken";
  return [
    "You are a friendly language tutor. The user gives you something they just read. Build a",
    `short personalized lesson to learn ${target} (their level: ${level}). Their native language is ${native}.`,
    "Base the vocabulary and phrases on the TOPIC of the content, so it feels relevant.",
    `Keep ${target} appropriate to level ${level} (simple for A1/A2, richer for B2+).`,
    "",
    `For every vocab item add "pos" = its part of speech: one of "noun", "verb", "adjective", "other".`,
    "Return ONLY valid JSON in this exact shape:",
    "{",
    `  "summary_target": "a 2-4 sentence retelling of the topic in ${target}, at level ${level}",`,
    `  "summary_native": "the same summary in ${native}",`,
    `  "vocab": [{"term": "word/expression in ${target}", "translation": "in ${native}", "pos": "noun|verb|adjective|other", "example": "short example sentence in ${target}"}],`,
    `  "phrases": [{"phrase": "useful phrase in ${target}", "translation": "in ${native}"}],`,
    `  "culture": "an interesting LANGUAGE/CULTURE curiosity about ${country} related to this topic, written in ${native} (the user's language)"`,
    "}",
    "5-8 vocab items, 3-5 phrases. No text outside JSON, no markdown fences.",
  ].join("\n");
}

export function buildLingoUserPrompt(profile, content) {
  return [
    "TOPIC / CONTENT THE USER JUST READ:",
    '"""',
    (content || "").slice(0, 6000),
    '"""',
  ].join("\n");
}
