const STORAGE_KEY = "krytykai_settings";
const DEFAULTS = { enabled: true, autoAnalyzeChat: false, provider: "ondevice", apiKey: "" };

const $ = (id) => document.getElementById(id);

async function getSettings() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return { ...DEFAULTS, ...(data[STORAGE_KEY] || {}) };
}
async function patchSettings(patch) {
  const cur = await getSettings();
  await chrome.storage.sync.set({ [STORAGE_KEY]: { ...cur, ...patch } });
}

async function init() {
  const s = await getSettings();
  $("enabled").checked = !!s.enabled;
  $("autoAnalyzeChat").checked = !!s.autoAnalyzeChat;

  if (s.provider === "ondevice") {
    $("status").textContent = "On-device model (Gemini Nano) – free and private. Falls back to offline questions if unsupported.";
  } else if (s.provider === "heuristic") {
    $("status").textContent = "Offline mode. Change it in settings for content-tailored questions.";
  } else if (!s.apiKey) {
    $("status").textContent = `Provider: ${s.provider}, but no API key set. Add one in settings.`;
  } else {
    $("status").textContent = `Provider: ${s.provider}. API key is set.`;
  }

  $("enabled").addEventListener("change", (e) =>
    patchSettings({ enabled: e.target.checked })
  );
  $("autoAnalyzeChat").addEventListener("change", (e) =>
    patchSettings({ autoAnalyzeChat: e.target.checked })
  );

  $("analyzeNow").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "KRYTYKAI_TRIGGER", kind: "page" });
      window.close();
    }
  });

  $("openLibrary").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/library/library.html") });
    window.close();
  });
  $("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

  await renderProgress();
}

// Podgląd postępów – pokazuje się dopiero, gdy jest co pokazywać.
async function renderProgress() {
  const store = globalThis.KRYTYKAI_STORE;
  const catalog = globalThis.KRYTYKAI_CATALOG;
  if (!store || !catalog) return;
  const st = await store.getDashboardStats();
  if (!st.lessons_count) return;

  const lvl = catalog.getUserAppLevel(st.xp);
  $("pStreak").textContent = `🔥 ${st.streak}`;
  $("pXp").textContent = `${st.xp} XP · ${lvl.name}`;
  $("pFill").style.width = `${lvl.progress}%`;
  $("pDue").textContent = st.due_count
    ? `${st.due_count} words waiting for review`
    : `${st.vocab_count} words saved`;
  $("progress").hidden = false;
}

init();
