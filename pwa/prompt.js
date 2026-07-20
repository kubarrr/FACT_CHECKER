// Budowanie promptu dla LLM oraz heurystyczny tryb awaryjny (bez klucza API).

export function buildSystemPrompt(numQuestions) {
  return [
    "You are a critical fact-checking and credibility-assessment assistant.",
    "You will receive some content (an AI chat answer, a news article, or a snippet), optionally with the user's question.",
    "",
    "IMPORTANT: First DETECT the language of the analyzed content. Write the summary, the assessment note,",
    "and ALL questions in that SAME language (whatever language the content is in).",
    "",
    "Do TWO things:",
    "",
    "1) CREDIBILITY ASSESSMENT. Return an 'assessment' object with:",
    '   - "type": one of "fact" (concrete, verifiable, neutral tone), "opinion",',
    '     "clickbait" (sensational/emotional/baiting), "mixed", "uncertain".',
    '   - "risk": risk of disinformation or manipulation: "low" | "medium" | "high".',
    "     Raise risk for: emotional/sensational language, missing sources, exaggeration, vague",
    "     generalities, politically charged claims, clickbait phrasing. Lower it for concrete,",
    "     verifiable facts (e.g. sports results, data, dates, events, neutral tone).",
    '   - "note": one sentence justifying the assessment, written IN THE CONTENT LANGUAGE.',
    "",
    "2) QUESTIONS — MATCH THEIR CHARACTER TO THE ASSESSMENT:",
    '   - If risk = "high" or type = "clickbait"/"opinion": give EXACTLY 2 sharp VERIFICATION',
    '     questions (kind: "verify") that help check truthfulness and expose manipulation.',
    `   - If risk = "low" and type = "fact": give ${numQuestions} deeper CURIOSITY/EXPLORATION`,
    '     questions (kind: "explore") to learn more about the topic (e.g. for a sports result –',
    "     more about the athlete's achievements, records, historical context).",
    `   - Otherwise ("medium"): mix verification and exploration questions, up to ${numQuestions} total.`,
    "",
    'Each question (in the content language): {"q": "...", "why": "one sentence why", "kind": "verify"|"explore"}.',
    "Return ONLY valid JSON in this exact shape:",
    '{"assessment": {"type": "...", "risk": "...", "note": "..."}, "summary": "one sentence", "questions": [{"q": "...", "why": "...", "kind": "..."}]}',
    "No text outside the JSON, no markdown fences.",
  ].join("\n");
}

export function buildUserPrompt({ userQuestion, answerText }) {
  const parts = [];
  if (userQuestion) parts.push(`USER'S QUESTION:\n${userQuestion}\n`);
  parts.push(`CONTENT TO ANALYZE:\n${answerText}`);
  return parts.join("\n");
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
