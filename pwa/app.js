import { heuristicQuestions } from "./prompt.js";
import { analyzeWithGemini, runGeminiJSON } from "./gemini.js";
import { analyzeWithBackend, learnWithBackend } from "./backend.js";
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
  en: { inputLabel: "Paste or share content to check:", placeholder: "Paste content here…", analyze: "Check credibility", clear: "Clear", settings: "Settings", engine: "Engine", apiKey: "Gemini API key", model: "Model", serverUrl: "Server URL", numQuestions: "Number of questions (1–7)", save: "Save", riskHigh: "High risk – be careful", riskMed: "Medium risk", riskLow: "Low risk – looks credible", kindVerify: "verify", kindExplore: "explore", copy: "Copy", copied: "Copied", ask: "Ask Gemini", loading: "Working…", needKey: "Add your Gemini API key in Settings, or switch to Offline mode.", needServer: "No server configured. Set a Server URL in Settings or switch engine.", noContent: "Paste or share some text first.", offline: "offline", factDesc: "Check credibility & get critical questions", storyDesc: "Grow from what you read — for your career", lingoDesc: "Learn a language & culture from the topic", back: "Back", profileTitle: "Your profile", profileIntro: "Used to personalize My Story AI and Linglerno AI. Stored only on this device.", pfRole: "Role / position", pfIndustry: "Industry / field", pfGoals: "Learning goals", pfSkills: "Skills to develop", pfInterests: "Interests", pfLangHead: "Language learning (Linglerno)", pfNative: "Your language", pfTarget: "Language you learn", pfLevel: "Level", pfCountry: "Country / culture of interest", inputStory: "Paste or share what you read:", inputLingo: "Paste or share a text to learn from:", runStory: "Get my insights", runLingo: "Make my lesson", needLearnLLM: "This mode needs Gemini (key) or the Server engine. Change it in ⚙️.", takeaways: "How to use this", learnNext: "Learn next", readNext: "Read next", lesson: "Micro-lesson", summaryLabel: "In your target language", vocab: "Vocabulary", phrases: "Useful phrases", culture: "Culture" },
  pl: { inputLabel: "Wklej lub udostępnij treść do sprawdzenia:", placeholder: "Wklej treść tutaj…", analyze: "Sprawdź wiarygodność", clear: "Wyczyść", settings: "Ustawienia", engine: "Silnik", apiKey: "Klucz API Gemini", model: "Model", serverUrl: "Adres serwera", numQuestions: "Liczba pytań (1–7)", save: "Zapisz", riskHigh: "Wysokie ryzyko – ostrożnie", riskMed: "Średnie ryzyko", riskLow: "Niskie ryzyko – wygląda wiarygodnie", kindVerify: "weryfikacja", kindExplore: "ciekawostka", copy: "Kopiuj", copied: "Skopiowano", ask: "Zapytaj w Gemini", loading: "Pracuję…", needKey: "Dodaj klucz API Gemini w Ustawieniach lub przełącz na tryb offline.", needServer: "Brak skonfigurowanego serwera. Ustaw adres serwera w Ustawieniach lub zmień silnik.", noContent: "Najpierw wklej lub udostępnij tekst.", offline: "offline", factDesc: "Sprawdź wiarygodność i dostań krytyczne pytania", storyDesc: "Rozwijaj się z tego, co czytasz — pod Twoją karierę", lingoDesc: "Ucz się języka i kultury z tematu", back: "Wstecz", profileTitle: "Twój profil", profileIntro: "Służy do personalizacji My Story AI i Linglerno AI. Zapisywany tylko na tym urządzeniu.", pfRole: "Rola / stanowisko", pfIndustry: "Branża / dziedzina", pfGoals: "Cele nauki", pfSkills: "Umiejętności do rozwoju", pfInterests: "Zainteresowania", pfLangHead: "Nauka języka (Linglerno)", pfNative: "Twój język", pfTarget: "Język, którego się uczysz", pfLevel: "Poziom", pfCountry: "Kraj / kultura, która Cię interesuje", inputStory: "Wklej lub udostępnij to, co przeczytałeś:", inputLingo: "Wklej lub udostępnij tekst do nauki:", runStory: "Pokaż wnioski dla mnie", runLingo: "Zrób moją lekcję", needLearnLLM: "Ten tryb wymaga Gemini (klucz) lub trybu Serwer. Zmień w ⚙️.", takeaways: "Jak to wykorzystać", learnNext: "Czego się dalej uczyć", readNext: "Co przeczytać dalej", lesson: "Mini-lekcja", summaryLabel: "W języku, którego się uczysz", vocab: "Słówka", phrases: "Przydatne zwroty", culture: "Kultura" },
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

// --- Nawigacja trybów ------------------------------------------------------
function showHome() {
  $("home").classList.remove("hidden");
  $("work").classList.add("hidden");
  $("brand").textContent = "🔍 Fact Checker AI";
  $("result").classList.add("hidden");
  $("result").innerHTML = "";
}

function openMode(mode) {
  state.mode = mode;
  $("home").classList.add("hidden");
  $("work").classList.remove("hidden");
  $("brand").textContent = MODE_TITLES[mode] || MODE_TITLES.factcheck;
  $("result").classList.add("hidden");
  $("result").innerHTML = "";

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
function renderAssessment(a) {
  if (!a || (!a.risk && !a.type)) return "";
  const r = String(a.risk || "").toLowerCase();
  let level = "med", label = tr("riskMed");
  if (r.includes("high") || r.includes("wys")) { level = "high"; label = tr("riskHigh"); }
  else if (r.includes("low") || r.includes("nis")) { level = "low"; label = tr("riskLow"); }
  const typeTxt = a.type ? ` · ${escapeHtml(a.type)}` : "";
  const note = a.note ? `<div class="assess-note">${escapeHtml(a.note)}</div>` : "";
  return `<div class="assess assess-${level}"><div class="assess-head">${escapeHtml(label)}${typeTxt}</div>${note}</div>`;
}

function renderResult(result) {
  const el = $("result");
  el.classList.remove("hidden");
  const badge = result.source === "heuristic"
    ? `<span class="badge badge-warn">${escapeHtml(tr("offline"))}</span>`
    : `<span class="badge">${escapeHtml(result.source || "gemini")}</span>`;
  const warn = result.warning ? `<div class="warn">${escapeHtml(result.warning)}</div>` : "";
  const summary = result.summary ? `<div class="summary">${escapeHtml(result.summary)}</div>` : "";
  const assessment = renderAssessment(result.assessment);

  const items = (result.questions || []).map((item) => {
    const q = escapeHtml(item.q || "");
    const why = item.why ? `<div class="why">${escapeHtml(item.why)}</div>` : "";
    const kind = item.kind === "explore"
      ? `<span class="kind kind-explore">${escapeHtml(tr("kindExplore"))}</span>`
      : item.kind === "verify"
      ? `<span class="kind kind-verify">${escapeHtml(tr("kindVerify"))}</span>`
      : "";
    const enc = encodeURIComponent(item.q || "");
    return `<li class="qitem"><div class="q">${kind}${q}</div>${why}
      <div class="qactions">
        <button class="ghost" data-copy="${enc}">${escapeHtml(tr("copy"))}</button>
        <button class="ghost" data-ask="${enc}">${escapeHtml(tr("ask"))}</button>
      </div></li>`;
  }).join("");

  el.innerHTML = `${badge}${assessment}${warn}${summary}<ul class="qlist">${items}</ul>`;

  el.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", () => {
      navigator.clipboard.writeText(decodeURIComponent(b.dataset.copy)).then(() => {
        const o = b.textContent; b.textContent = tr("copied"); setTimeout(() => (b.textContent = o), 1200);
      });
    })
  );
  el.querySelectorAll("[data-ask]").forEach((b) =>
    b.addEventListener("click", () => {
      const q = decodeURIComponent(b.dataset.ask);
      navigator.clipboard.writeText(buildAskPrompt(q)).catch(() => {});
      window.open("https://gemini.google.com/app", "_blank", "noopener");
    })
  );
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// --- Render: My Story AI ---------------------------------------------------
function learnSection(title, innerHtml) {
  return innerHtml ? `<div class="learn-sec"><div class="learn-h">${escapeHtml(title)}</div>${innerHtml}</div>` : "";
}

function renderStory(r) {
  const el = $("result");
  el.classList.remove("hidden");
  const takeaways = (r.takeaways || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  const learn = (r.learn_next || []).map((x) => `<li><b>${escapeHtml(x.topic || "")}</b>${x.why ? ` — ${escapeHtml(x.why)}` : ""}</li>`).join("");
  const read = (r.read_next || []).map((x) => `<li><b>${escapeHtml(x.title || "")}</b>${x.why ? ` — ${escapeHtml(x.why)}` : ""}</li>`).join("");
  el.innerHTML =
    learnSection(tr("takeaways"), takeaways ? `<ul>${takeaways}</ul>` : "") +
    learnSection(tr("learnNext"), learn ? `<ul>${learn}</ul>` : "") +
    learnSection(tr("readNext"), read ? `<ul>${read}</ul>` : "") +
    learnSection(tr("lesson"), r.lesson ? `<p>${escapeHtml(r.lesson)}</p>` : "");
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
    ? `<p>${escapeHtml(r.summary_target)}</p>${r.summary_native ? `<p class="muted small">${escapeHtml(r.summary_native)}</p>` : ""}`
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
      const result = await analyzeWithBackend({ endpoint: s.backendUrl, userQuestion: "", answerText: text, numQuestions: s.numQuestions });
      renderResult({ ...result, source: "server" });
      return;
    }
    const result = await analyzeWithGemini({ apiKey: s.apiKey, model: s.model, userQuestion: "", answerText: text, numQuestions: s.numQuestions });
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
      result = await learnWithBackend({ endpoint: s.backendUrl, mode: "story", profile, answerText: text });
    } else {
      result = await runGeminiJSON({
        apiKey: s.apiKey,
        model: s.model,
        system: buildStorySystemPrompt(),
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
      result = await learnWithBackend({ endpoint: s.backendUrl, mode: "lingo", profile, answerText: text });
    } else {
      result = await runGeminiJSON({
        apiKey: s.apiKey,
        model: s.model,
        system: buildLingoSystemPrompt(profile),
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
