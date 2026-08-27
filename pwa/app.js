import { heuristicQuestions } from "./prompt.js";
import { analyzeWithGemini, runGeminiJSON, askWithGemini } from "./gemini.js";
import { analyzeWithBackend, learnWithBackend, askWithBackend } from "./backend.js";
import { BACKEND_URL } from "./config.js";
import {
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  buildLingoSystemPrompt,
  buildLingoUserPrompt,
} from "./learn.js";

// --- Ustawienia (localStorage) --------------------------------------------
const LS_KEY = "factchecker_pwa_settings";
const PROFILE_KEY = "factchecker_profile";
const DEFAULTS = {
  provider: BACKEND_URL ? "server" : "gemini",
  apiKey: "",
  model: "gemini-3.1-flash-lite",
  numQuestions: 4,
  backendUrl: BACKEND_URL,
};

function loadSettings() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(LS_KEY)) || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// --- i18n interfejsu -------------------------------------------------------
const I18N = {
  en: { inputLabel: "Paste or share content to check:", placeholder: "Paste content here…", analyze: "Check credibility", clear: "Clear", settings: "Settings", engine: "Engine", apiKey: "Gemini API key", model: "Model", serverUrl: "Server URL", numQuestions: "Number of questions (1–7)", save: "Save", riskHigh: "High risk – be careful", riskMed: "Medium risk", riskLow: "Low risk – looks credible", kindVerify: "verify", kindExplore: "explore", kindPerspective: "other side", sources: "Sources (from the web)", copy: "Copy", copied: "Copied", ask: "Ask Gemini", loading: "Working…", needKey: "Add your Gemini API key in Settings, or switch to Offline mode.", needServer: "No server configured. Set a Server URL in Settings or switch engine.", noContent: "Paste or share some text first.", offline: "offline", more: "More", less: "Less", edit: "Edit", questionsH: "Questions", askOwn: "Ask your own question about this text…", askSend: "Ask", basisArticle: "from the text", basisModel: "model's knowledge", basisUnknown: "not settled here", factDesc: "Check credibility & get critical questions", storyDesc: "Grow from what you read — for your career", lingoDesc: "Learn a language & culture from the topic", back: "Back", profileTitle: "Your profile", profileIntro: "Used to personalize My Story AI and Linglerno AI. Stored only on this device.", pfRole: "Role / position", pfIndustry: "Industry / field", pfGoals: "Learning goals", pfSkills: "Skills to develop", pfInterests: "Interests", pfLangHead: "Language learning (Linglerno)", pfNative: "Your language", pfTarget: "Language you learn", pfLevel: "Level", pfCountry: "Country / culture of interest", inputStory: "Paste or share what you read:", inputLingo: "Paste or share a text to learn from:", runStory: "Get my insights", runLingo: "Make my lesson", needLearnLLM: "This mode needs Gemini (key) or the Server engine. Change it in ⚙️.", takeaways: "How to use this", learnNext: "Learn next", readNext: "Read next", lesson: "Micro-lesson", summaryLabel: "In your target language", vocab: "Vocabulary", phrases: "Useful phrases", culture: "Culture", searchGoogle: "Search Google", course: "Course / video" },
  pl: { inputLabel: "Wklej lub udostępnij treść do sprawdzenia:", placeholder: "Wklej treść tutaj…", analyze: "Sprawdź wiarygodność", clear: "Wyczyść", settings: "Ustawienia", engine: "Silnik", apiKey: "Klucz API Gemini", model: "Model", serverUrl: "Adres serwera", numQuestions: "Liczba pytań (1–7)", save: "Zapisz", riskHigh: "Wysokie ryzyko – ostrożnie", riskMed: "Średnie ryzyko", riskLow: "Niskie ryzyko – wygląda wiarygodnie", kindVerify: "weryfikacja", kindExplore: "ciekawostka", kindPerspective: "druga strona", sources: "Źródła (z internetu)", copy: "Kopiuj", copied: "Skopiowano", ask: "Zapytaj w Gemini", loading: "Pracuję…", needKey: "Dodaj klucz API Gemini w Ustawieniach lub przełącz na tryb offline.", needServer: "Brak skonfigurowanego serwera. Ustaw adres serwera w Ustawieniach lub zmień silnik.", noContent: "Najpierw wklej lub udostępnij tekst.", offline: "offline", more: "Więcej", less: "Mniej", edit: "Zmień", questionsH: "Pytania", askOwn: "Zapytaj o ten tekst po swojemu…", askSend: "Zapytaj", basisArticle: "z artykułu", basisModel: "wiedza modelu", basisUnknown: "nie do rozstrzygnięcia", factDesc: "Sprawdź wiarygodność i dostań krytyczne pytania", storyDesc: "Rozwijaj się z tego, co czytasz — pod Twoją karierę", lingoDesc: "Ucz się języka i kultury z tematu", back: "Wstecz", profileTitle: "Twój profil", profileIntro: "Służy do personalizacji My Story AI i Linglerno AI. Zapisywany tylko na tym urządzeniu.", pfRole: "Rola / stanowisko", pfIndustry: "Branża / dziedzina", pfGoals: "Cele nauki", pfSkills: "Umiejętności do rozwoju", pfInterests: "Zainteresowania", pfLangHead: "Nauka języka (Linglerno)", pfNative: "Twój język", pfTarget: "Język, którego się uczysz", pfLevel: "Poziom", pfCountry: "Kraj / kultura, która Cię interesuje", inputStory: "Wklej lub udostępnij to, co przeczytałeś:", inputLingo: "Wklej lub udostępnij tekst do nauki:", runStory: "Pokaż wnioski dla mnie", runLingo: "Zrób moją lekcję", needLearnLLM: "Ten tryb wymaga Gemini (klucz) lub trybu Serwer. Zmień w ⚙️.", takeaways: "Jak to wykorzystać", learnNext: "Czego się dalej uczyć", readNext: "Co przeczytać dalej", lesson: "Mini-lekcja", summaryLabel: "W języku, którego się uczysz", vocab: "Słówka", phrases: "Przydatne zwroty", culture: "Kultura", searchGoogle: "Szukaj w Google", course: "Kurs / wideo" },
  es: { inputLabel: "Pega o comparte contenido para verificar:", placeholder: "Pega el contenido aquí…", analyze: "Verificar credibilidad", clear: "Borrar", settings: "Ajustes", engine: "Motor", apiKey: "Clave API de Gemini", model: "Modelo", serverUrl: "URL del servidor", numQuestions: "Número de preguntas (1–7)", save: "Guardar", riskHigh: "Riesgo alto – cuidado", riskMed: "Riesgo medio", riskLow: "Riesgo bajo – parece creíble", kindVerify: "verificación", kindExplore: "curiosidad", copy: "Copiar", copied: "Copiado", ask: "Preguntar a Gemini", loading: "Trabajando…", needKey: "Añade tu clave API de Gemini en Ajustes o usa el modo sin conexión.", needServer: "No hay servidor configurado. Define una URL en Ajustes o cambia de motor.", noContent: "Pega o comparte un texto primero.", offline: "sin conexión" },
  de: { inputLabel: "Inhalt zum Prüfen einfügen oder teilen:", placeholder: "Inhalt hier einfügen…", analyze: "Glaubwürdigkeit prüfen", clear: "Leeren", settings: "Einstellungen", engine: "Engine", apiKey: "Gemini-API-Schlüssel", model: "Modell", serverUrl: "Server-URL", numQuestions: "Anzahl der Fragen (1–7)", save: "Speichern", riskHigh: "Hohes Risiko – Vorsicht", riskMed: "Mittleres Risiko", riskLow: "Geringes Risiko – wirkt glaubwürdig", kindVerify: "Prüfung", kindExplore: "Vertiefung", copy: "Kopieren", copied: "Kopiert", ask: "Gemini fragen", loading: "Arbeite…", needKey: "Füge deinen Gemini-API-Schlüssel in den Einstellungen hinzu oder nutze den Offline-Modus.", needServer: "Kein Server konfiguriert. Server-URL in Einstellungen setzen oder Engine wechseln.", noContent: "Zuerst Text einfügen oder teilen.", offline: "offline" },
  fr: { inputLabel: "Colle ou partage un contenu à vérifier :", placeholder: "Colle le contenu ici…", analyze: "Vérifier la crédibilité", clear: "Effacer", settings: "Paramètres", engine: "Moteur", apiKey: "Clé API Gemini", model: "Modèle", serverUrl: "URL du serveur", numQuestions: "Nombre de questions (1–7)", save: "Enregistrer", riskHigh: "Risque élevé – prudence", riskMed: "Risque moyen", riskLow: "Risque faible – semble crédible", kindVerify: "vérification", kindExplore: "découverte", copy: "Copier", copied: "Copié", ask: "Demander à Gemini", loading: "Traitement…", needKey: "Ajoute ta clé API Gemini dans les Paramètres ou passe en mode hors ligne.", needServer: "Aucun serveur configuré. Définis une URL dans les Paramètres ou change de moteur.", noContent: "Colle ou partage d'abord un texte.", offline: "hors ligne" },
};
const UI_LANG = (navigator.language || "en").slice(0, 2).toLowerCase();
const T = I18N[UI_LANG] || I18N.en;
const tr = (k) => T[k] ?? I18N.en[k] ?? k;

const $ = (id) => document.getElementById(id);

const MODE_TITLES = {
  factcheck: "🔍 Fact Checker AI",
  story: "📖 My Story AI",
  lingo: "🗣️ Linglerno AI",
};

let state = { mode: "factcheck" };
let currentContext = { text: "", url: "" };

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    const v = tr(k);
    if (v) el.textContent = v;
  });
}

// --- Ekstrakcja treści z "Udostępnij" (share_target GET) -------------------
function readSharedContent() {
  const p = new URLSearchParams(location.search);
  const parts = [p.get("title"), p.get("text"), p.get("url")].filter(Boolean);
  return parts.join("\n").trim();
}
function readSharedUrl() {
  return new URLSearchParams(location.search).get("url") || "";
}

function buildAskPrompt(question) {
  const src = (currentContext.text || "").slice(0, 2000);
  const parts = [
    "Answer this verification question critically and cite sources. Reply in the same language as the question:",
    question,
  ];
  if (src) parts.push(`\nContext (the content being verified):\n"""\n${src}\n"""`);
  if (currentContext.url) parts.push(`\nSource: ${currentContext.url}`);
  return parts.join("\n");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Zamienia markdownowe **pogrubienie** na <strong> (po zabezpieczeniu HTML).
function mdBold(text) {
  return escapeHtml(String(text || "")).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

// Znaczniki [[słowo]] → podświetlenie (streszczenie w języku nauki) lub pogrubienie
// (odpowiedniki w tłumaczeniu użytkownika).
function markHighlights(text, mode) {
  const wrap = mode === "bold" ? (s) => `<strong>${s}</strong>` : (s) => `<mark class="hl">${s}</mark>`;
  return escapeHtml(String(text || "")).replace(/\[\[([^\]]+)\]\]/g, (_m, g) => wrap(g));
}

// --- Nawigacja trybów ------------------------------------------------------
function showHome() {
  $("home").classList.remove("hidden");
  $("work").classList.add("hidden");
  $("brand").textContent = "🔍 Fact Checker AI";
  $("result").classList.add("hidden");
  $("result").innerHTML = "";
  expandInput();
}

function openMode(mode) {
  state.mode = mode;
  $("home").classList.add("hidden");
  $("work").classList.remove("hidden");
  $("brand").textContent = MODE_TITLES[mode] || MODE_TITLES.factcheck;
  $("result").classList.add("hidden");
  $("result").innerHTML = "";
  expandInput();

  if (mode === "story") {
    $("inputLabel").textContent = tr("inputStory");
    $("runBtn").textContent = tr("runStory");
  } else if (mode === "lingo") {
    $("inputLabel").textContent = tr("inputLingo");
    $("runBtn").textContent = tr("runLingo");
  } else {
    $("inputLabel").textContent = tr("inputLabel");
    $("runBtn").textContent = tr("analyze");
  }
  $("content").placeholder = tr("placeholder");
}

function runCurrent() {
  if (state.mode === "story") return runStory();
  if (state.mode === "lingo") return runLingo();
  return analyze();
}

// --- Render: ocena wiarygodności (Fact Checker) ---------------------------
// Na telefonie ekran ma pokazać JEDNĄ rzecz bez przewijania: werdykt.
// Uzasadnienia i akcje chowamy pod dotknięcie – to one robiły ścianę tekstu.
const RISK_KEY = { high: "riskHigh", med: "riskMed", low: "riskLow" };

function riskLevel(a) {
  const r = String(a?.risk || "").toLowerCase();
  if (r.includes("high") || r.includes("wys")) return "high";
  if (r.includes("low") || r.includes("nis")) return "low";
  return "med";
}

function renderVerdict(a) {
  if (!a || (!a.risk && !a.type)) return "";
  const level = riskLevel(a);
  // Etykiety mają formę „Wysokie ryzyko – ostrożnie": przed myślnikiem stoi
  // werdykt (duży), po myślniku rada (mała). Nagłówek zostaje jednolinijkowy.
  const [head, ...rest] = tr(RISK_KEY[level]).split("–");
  const sub = rest.join("–").trim();
  const type = a.type ? `<span class="v-type">${escapeHtml(a.type)}</span>` : "";
  return `<div class="verdict v-${level}"><span class="v-label">${escapeHtml(
    head.trim()
  )}</span>${type}${sub ? `<span class="v-sub">${escapeHtml(sub)}</span>` : ""}</div>`;
}

// Nota z oceny i streszczenie to jeden akapit przycięty do trzech linii.
function renderBrief(result) {
  const text = [result.assessment?.note, result.summary].filter(Boolean).join(" ");
  if (!text) return "";
  return `<div class="brief"><div class="brief-text clamp" id="briefText">${escapeHtml(
    text
  )}</div><button type="button" class="link-btn hidden" id="briefToggle">${escapeHtml(
    tr("more")
  )}</button></div>`;
}

function questionKind(item) {
  if (item.kind === "explore") return { cls: "explore", label: tr("kindExplore") };
  if (item.kind === "perspective") return { cls: "persp", label: tr("kindPerspective") };
  return { cls: "verify", label: tr("kindVerify") };
}

function renderResult(result) {
  const el = $("result");
  el.classList.remove("hidden");

  const warn = result.warning ? `<div class="warn">${escapeHtml(result.warning)}</div>` : "";
  const questions = result.questions || [];
  const items = questions
    .map((item, i) => {
      const k = questionKind(item);
      const enc = encodeURIComponent(item.q || "");
      return `<li class="qitem k-${k.cls}">
        <button type="button" class="qrow" aria-expanded="false" aria-controls="qbody-${i}" data-idx="${i}">
          <span class="qdot"></span>
          <span class="qtext">${escapeHtml(item.q || "")}</span>
          <span class="qchev">›</span>
        </button>
        <div class="qbody" id="qbody-${i}" hidden>
          <span class="kind kind-${k.cls}">${escapeHtml(k.label)}</span>
          ${item.why ? `<div class="why">${escapeHtml(item.why)}</div>` : ""}
          <div class="qactions">
            <button class="ghost" data-copy="${enc}">${escapeHtml(tr("copy"))}</button>
          </div>
        </div>
      </li>`;
    })
    .join("");

  // Własne pytanie – droga na wypadek, gdy żadne z wygenerowanych nie trafia.
  const askRow = `<form class="ask-row" id="askRow"><input type="text" id="askInput" placeholder="${escapeHtml(
    tr("askOwn")
  )}" autocomplete="off" /><button type="submit" class="btn-ask">${escapeHtml(
    tr("askSend")
  )}</button></form><div class="qanswer" id="askAnswer"></div>`;

  const qBlock = items
    ? `<div class="sec-h">${escapeHtml(tr("questionsH"))}<span class="count">${
        questions.length
      }</span></div><ul class="qlist">${items}</ul>${askRow}`
    : askRow;

  const src = Array.isArray(result.sources) ? result.sources.slice(0, 6) : [];
  const sources = src.length
    ? `<details class="sources"><summary>${escapeHtml(tr("sources"))} (${
        src.length
      })</summary><ul>${src
        .map(
          (x) =>
            `<li><a href="${encodeURI(x.url || "#")}" target="_blank" rel="noopener">${escapeHtml(
              x.title || x.url || ""
            )}</a></li>`
        )
        .join("")}</ul></details>`
    : "";

  const meta = result.source === "heuristic" ? tr("offline") : result.source || "gemini";

  el.innerHTML = `${renderVerdict(result.assessment)}${warn}${renderBrief(
    result
  )}${qBlock}${sources}<div class="result-meta">${escapeHtml(meta)}</div>`;

  bindResult(el);
  collapseInput();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindResult(el) {
  // „Więcej" pokazujemy tylko wtedy, gdy tekst faktycznie się nie mieści.
  const brief = el.querySelector("#briefText");
  const toggle = el.querySelector("#briefToggle");
  if (brief && toggle && brief.scrollHeight > brief.clientHeight + 2) {
    toggle.classList.remove("hidden");
    toggle.addEventListener("click", () => {
      const clamped = brief.classList.toggle("clamp");
      toggle.textContent = clamped ? tr("more") : tr("less");
    });
  }

  // Akordeon: otwarte jest naraz jedno pytanie, więc lista zostaje skanowalna.
  const rows = [...el.querySelectorAll(".qrow")];
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const wasOpen = row.getAttribute("aria-expanded") === "true";
      rows.forEach((r) => r.setAttribute("aria-expanded", "false"));
      el.querySelectorAll(".qbody").forEach((bd) => (bd.hidden = true));
      if (!wasOpen) {
        row.setAttribute("aria-expanded", "true");
        el.querySelector(`#qbody-${row.dataset.idx}`).hidden = false;
      }
    });
  });

  el.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", () => {
      navigator.clipboard.writeText(decodeURIComponent(b.dataset.copy)).then(() => {
        const o = b.textContent;
        b.textContent = tr("copied");
        setTimeout(() => (b.textContent = o), 1200);
      });
    })
  );
  const form = el.querySelector("#askRow");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = el.querySelector("#askInput").value.trim();
      if (q) askAbout(q, el.querySelector("#askAnswer"), form.querySelector(".btn-ask"));
    });
  }
}

// Pytanie o sprawdzany tekst. Najważniejsze w odpowiedzi nie jest samo zdanie,
// tylko na czym stoi: na treści artykułu czy na wiedzy modelu.
const BASIS = {
  article: { cls: "article", key: "basisArticle" },
  model: { cls: "model", key: "basisModel" },
  unknown: { cls: "unknown", key: "basisUnknown" },
};

function renderAnswer(r) {
  const b = BASIS[String(r?.basis || "").toLowerCase()] || BASIS.unknown;
  const caveat = r?.caveat ? `<div class="caveat">${escapeHtml(r.caveat)}</div>` : "";
  return `<div class="answer"><span class="basis basis-${b.cls}">${escapeHtml(
    tr(b.key)
  )}</span><p>${escapeHtml(r?.answer || "")}</p>${caveat}</div>`;
}

async function askAbout(question, mount, btn) {
  if (!mount || (btn && btn.disabled)) return;
  const s = loadSettings();
  const hasModel =
    (s.provider === "server" && s.backendUrl) || (s.provider === "gemini" && s.apiKey);
  // Bez modelu zostaje stara droga: skopiuj pytanie z kontekstem i otwórz Gemini.
  if (!hasModel) {
    navigator.clipboard.writeText(buildAskPrompt(question)).catch(() => {});
    window.open("https://gemini.google.com/app", "_blank", "noopener");
    return;
  }

  if (btn) btn.disabled = true;
  mount.innerHTML = `<div class="loading">${escapeHtml(tr("loading"))}</div>`;
  try {
    const answerText = currentContext.text || "";
    const r =
      s.provider === "server"
        ? await askWithBackend({
            endpoint: s.backendUrl,
            question,
            answerText,
            language: UI_LANG,
          })
        : await askWithGemini({
            apiKey: s.apiKey,
            model: s.model,
            question,
            answerText,
            language: UI_LANG,
          });
    mount.innerHTML = renderAnswer(r);
  } catch (err) {
    mount.innerHTML = `<div class="warn">${escapeHtml(String(err?.message || err))}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Po analizie karta wejścia zwija się w jedną linijkę – werdykt wchodzi wyżej.
function collapseInput() {
  const text = (currentContext.text || $("content").value || "").replace(/\s+/g, " ").trim();
  if (!text) return;
  $("sourceChipText").textContent = text.slice(0, 90);
  $("sourceChip").classList.remove("hidden");
  $("inputCard").classList.add("hidden");
}

function expandInput() {
  $("sourceChip").classList.add("hidden");
  $("inputCard").classList.remove("hidden");
}

// --- Render: My Story AI ---------------------------------------------------
function learnSection(title, innerHtml) {
  return innerHtml ? `<div class="learn-sec"><div class="learn-h">${escapeHtml(title)}</div>${innerHtml}</div>` : "";
}

function renderStory(r) {
  const el = $("result");
  el.classList.remove("hidden");
  const takeaways = (r.takeaways || []).map((t) => `<li>${mdBold(t)}</li>`).join("");
  const read = (r.read_next || [])
    .slice(0, 2)
    .map((x) => {
      const query = x.query || x.title || "";
      const q = encodeURIComponent(String(query).slice(0, 200));
      const why = x.why ? ` — ${mdBold(x.why)}` : "";
      const g = `https://www.google.com/search?q=${q}`;
      const yt = `https://www.youtube.com/results?search_query=${q}`;
      return `<li><b>${mdBold(query)}</b>${why}<div class="read-links"><a href="${g}" target="_blank" rel="noopener">${escapeHtml(
        tr("searchGoogle")
      )}</a> · <a href="${yt}" target="_blank" rel="noopener">${escapeHtml(tr("course"))}</a></div></li>`;
    })
    .join("");
  el.innerHTML =
    learnSection(tr("takeaways"), takeaways ? `<ul>${takeaways}</ul>` : "") +
    learnSection(tr("readNext"), read ? `<ul>${read}</ul>` : "") +
    learnSection(tr("lesson"), r.lesson ? `<p>${mdBold(r.lesson)}</p>` : "");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Render: Linglerno AI --------------------------------------------------
function renderLingo(r) {
  const el = $("result");
  el.classList.remove("hidden");
  const vocab = (r.vocab || []).map((v) =>
    `<li><b>${escapeHtml(v.term || "")}</b> — ${escapeHtml(v.translation || "")}${v.example ? `<div class="why">${escapeHtml(v.example)}</div>` : ""}</li>`
  ).join("");
  const phrases = (r.phrases || []).map((p) =>
    `<li><b>${escapeHtml(p.phrase || "")}</b> — ${escapeHtml(p.translation || "")}</li>`
  ).join("");
  const summary = r.summary_target
    ? `<p>${markHighlights(r.summary_target, "hl")}</p>${r.summary_native ? `<p class="muted small">${markHighlights(r.summary_native, "bold")}</p>` : ""}`
    : "";
  el.innerHTML =
    learnSection(tr("summaryLabel"), summary) +
    learnSection(tr("vocab"), vocab ? `<ul class="lingo-list">${vocab}</ul>` : "") +
    learnSection(tr("phrases"), phrases ? `<ul class="lingo-list">${phrases}</ul>` : "") +
    learnSection(tr("culture"), r.culture ? `<p>${escapeHtml(r.culture)}</p>` : "");
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLoading() {
  const el = $("result");
  el.classList.remove("hidden");
  el.innerHTML = `<div class="loading">${escapeHtml(tr("loading"))}</div>`;
}
function renderMessage(msg) {
  const el = $("result");
  el.classList.remove("hidden");
  el.innerHTML = `<div class="warn">${escapeHtml(msg)}</div>`;
}

// --- Fact Checker ----------------------------------------------------------
async function analyze() {
  const s = loadSettings();
  const text = $("content").value.trim();
  if (!text) { renderMessage(tr("noContent")); return; }
  currentContext.text = text;

  if (s.provider === "gemini" && !s.apiKey) { renderMessage(tr("needKey")); return; }
  if (s.provider === "server" && !s.backendUrl) { renderMessage(tr("needServer")); return; }

  renderLoading();
  try {
    if (s.provider === "heuristic") {
      renderResult({ ...heuristicQuestions(text, s.numQuestions), source: "heuristic" });
      return;
    }
    if (s.provider === "server") {
      const result = await analyzeWithBackend({ endpoint: s.backendUrl, userQuestion: "", answerText: text, numQuestions: s.numQuestions, language: UI_LANG });
      renderResult({ ...result, source: "server" });
      return;
    }
    const result = await analyzeWithGemini({ apiKey: s.apiKey, model: s.model, userQuestion: "", answerText: text, numQuestions: s.numQuestions, language: UI_LANG });
    renderResult({ ...result, source: "gemini" });
  } catch (err) {
    renderResult({ ...heuristicQuestions(text, s.numQuestions), source: "heuristic", warning: `Gemini: ${String(err?.message || err)}` });
  }
}

// --- My Story AI -----------------------------------------------------------
async function runStory() {
  const s = loadSettings();
  const text = $("content").value.trim();
  if (!text) { renderMessage(tr("noContent")); return; }
  if (s.provider === "heuristic") { renderMessage(tr("needLearnLLM")); return; }
  if (s.provider === "gemini" && !s.apiKey) { renderMessage(tr("needKey")); return; }
  if (s.provider === "server" && !s.backendUrl) { renderMessage(tr("needServer")); return; }

  const profile = loadProfile();
  renderLoading();
  try {
    let result;
    if (s.provider === "server") {
      result = await learnWithBackend({ endpoint: s.backendUrl, mode: "story", profile, answerText: text, language: UI_LANG });
    } else {
      result = await runGeminiJSON({
        apiKey: s.apiKey,
        model: s.model,
        system: buildStorySystemPrompt(UI_LANG),
        user: buildStoryUserPrompt(profile, text),
      });
    }
    renderStory(result);
  } catch (err) {
    renderMessage(`Błąd: ${String(err?.message || err)}`);
  }
}

// --- Linglerno AI ----------------------------------------------------------
async function runLingo() {
  const s = loadSettings();
  const text = $("content").value.trim();
  if (!text) { renderMessage(tr("noContent")); return; }
  if (s.provider === "heuristic") { renderMessage(tr("needLearnLLM")); return; }
  if (s.provider === "gemini" && !s.apiKey) { renderMessage(tr("needKey")); return; }
  if (s.provider === "server" && !s.backendUrl) { renderMessage(tr("needServer")); return; }

  const profile = loadProfile();
  renderLoading();
  try {
    let result;
    if (s.provider === "server") {
      result = await learnWithBackend({ endpoint: s.backendUrl, mode: "lingo", profile, answerText: text, language: UI_LANG });
    } else {
      result = await runGeminiJSON({
        apiKey: s.apiKey,
        model: s.model,
        system: buildLingoSystemPrompt(profile, UI_LANG),
        user: buildLingoUserPrompt(profile, text),
      });
    }
    renderLingo(result);
  } catch (err) {
    renderMessage(`Błąd: ${String(err?.message || err)}`);
  }
}

// --- Ustawienia UI ---------------------------------------------------------
function openSettings() {
  const s = loadSettings();
  $("provider").value = s.provider;
  $("apiKey").value = s.apiKey;
  $("model").value = s.model;
  $("backendUrl").value = s.backendUrl;
  $("numQuestions").value = s.numQuestions;
  toggleWraps();
  $("settingsDlg").showModal();
}
function toggleWraps() {
  const p = $("provider").value;
  $("keyWrap").style.display = p === "gemini" ? "block" : "none";
  $("serverWrap").style.display = p === "server" ? "block" : "none";
}
function commitSettings() {
  let n = parseInt($("numQuestions").value, 10);
  if (isNaN(n)) n = 4;
  n = Math.min(7, Math.max(1, n));
  saveSettings({
    provider: $("provider").value,
    apiKey: $("apiKey").value.trim(),
    model: $("model").value.trim() || "gemini-3.1-flash-lite",
    backendUrl: $("backendUrl").value.trim().replace(/\/+$/, ""),
    numQuestions: n,
  });
  updateEngineNote();
}
function updateEngineNote() {
  const s = loadSettings();
  const note = $("engineNote");
  if (!note) return;
  if (s.provider === "heuristic") note.textContent = "Offline mode.";
  else if (s.provider === "server") note.textContent = s.backendUrl ? "Server mode – ready." : "Server mode selected but no URL set (tap ⚙️).";
  else if (!s.apiKey) note.textContent = "Gemini selected but no API key set (tap ⚙️).";
  else note.textContent = `Gemini (${s.model}).`;
}

// --- Profil UI -------------------------------------------------------------
function openProfile() {
  const p = loadProfile();
  $("pf_role").value = p.role || "";
  $("pf_industry").value = p.industry || "";
  $("pf_goals").value = p.goals || "";
  $("pf_skills").value = p.skills || "";
  $("pf_interests").value = p.interests || "";
  $("pf_native").value = p.nativeLang || "";
  $("pf_target").value = p.targetLang || "";
  $("pf_level").value = p.level || "A2";
  $("pf_country").value = p.country || "";
  $("profileDlg").showModal();
}
function commitProfile() {
  saveProfile({
    role: $("pf_role").value.trim(),
    industry: $("pf_industry").value.trim(),
    goals: $("pf_goals").value.trim(),
    skills: $("pf_skills").value.trim(),
    interests: $("pf_interests").value.trim(),
    nativeLang: $("pf_native").value.trim(),
    targetLang: $("pf_target").value.trim(),
    level: $("pf_level").value,
    country: $("pf_country").value.trim(),
  });
}

// --- Init ------------------------------------------------------------------
function init() {
  applyI18n();
  updateEngineNote();

  document.querySelectorAll(".mode-card").forEach((btn) =>
    btn.addEventListener("click", () => openMode(btn.dataset.mode))
  );
  $("backBtn").addEventListener("click", showHome);
  $("runBtn").addEventListener("click", runCurrent);
  $("clearBtn").addEventListener("click", () => {
    $("content").value = "";
    $("result").classList.add("hidden");
    $("result").innerHTML = "";
    expandInput();
  });
  $("sourceChip").addEventListener("click", () => {
    expandInput();
    $("content").focus();
  });
  $("settingsBtn").addEventListener("click", openSettings);
  $("provider").addEventListener("change", toggleWraps);
  $("saveSettings").addEventListener("click", commitSettings);
  $("profileBtn").addEventListener("click", openProfile);
  $("saveProfile").addEventListener("click", commitProfile);

  // Treść z „Udostępnij" → otwórz Fact Checker i przeanalizuj (bez zmian).
  currentContext.url = readSharedUrl();
  const shared = readSharedContent();
  if (shared) {
    openMode("factcheck");
    $("content").value = shared;
    analyze();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
