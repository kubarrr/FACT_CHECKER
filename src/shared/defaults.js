// Wspólne wartości domyślne i klucze magazynu ustawień.
// Importowane przez service workera (moduł). Content script trzyma własną kopię
// stałych, bo content scripty w MV3 nie są modułami ES.

export const STORAGE_KEY = "krytykai_settings";

// Konkretny, aktualny model (lżejszy i zwykle mniej obłożony niż główny Flash).
// gemini-2.5-flash-lite zostało wycofane dla nowych kont → używamy 3.1.
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

// Stare/wycofane nazwy modeli – automatycznie migrujemy je na alias „latest".
const DEPRECATED_GEMINI = /^gemini-(1\.0|1\.5|2\.0|2\.5)/i;

export const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "ondevice", // "ondevice" | "gemini" | "openai" | "heuristic"
  apiKey: "",
  geminiModel: DEFAULT_GEMINI_MODEL,
  openaiModel: "gpt-4o-mini",
  autoAnalyzeChat: false, // czy analizować automatycznie po każdej odpowiedzi
  language: "pl",
  numQuestions: 4,
  // Backend w chmurze z Twoim kluczem (grounding + limity). Pusty = fact-check
  // działa lokalnie (Nano / własny klucz), bez weryfikacji w realnych źródłach.
  backendUrl: "",
  // Profil użytkownika – personalizuje tryby My Story i Linglerno.
  profile: {
    role: "",
    industry: "",
    goals: "",
    skills: "",
    interests: "",
    nativeLang: "",
    targetLang: "",
    level: "A2",
    country: "",
  },
};

export async function loadSettings() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  const merged = { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEY] || {}) };
  // Auto-migracja wycofanych modeli Gemini na działający alias.
  if (!merged.geminiModel || DEPRECATED_GEMINI.test(merged.geminiModel)) {
    merged.geminiModel = DEFAULT_GEMINI_MODEL;
  }
  return merged;
}

export async function saveSettings(patch) {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
}
