const STORAGE_KEY = "krytykai_settings";
const DEFAULTS = {
  enabled: true,
  provider: "ondevice",
  apiKey: "",
  geminiModel: "gemini-3.1-flash-lite",
  openaiModel: "gpt-4o-mini",
  autoAnalyzeChat: false,
  numQuestions: 4,
};

const $ = (id) => document.getElementById(id);

const KEY_HINTS = {
  ondevice: "",
  gemini: "Get a key from Google AI Studio: aistudio.google.com/app/apikey",
  openai: "Get a key from platform.openai.com/api-keys",
  heuristic: "Offline mode needs no key – questions are generic.",
};

async function getSettings() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  const merged = { ...DEFAULTS, ...(data[STORAGE_KEY] || {}) };
  // Migracja wycofanych modeli Gemini na działający alias „latest".
  if (!merged.geminiModel || /^gemini-(1\.0|1\.5|2\.0|2\.5)/i.test(merged.geminiModel)) {
    merged.geminiModel = "gemini-3.1-flash-lite";
  }
  return merged;
}

function applyProviderUI() {
  const provider = $("provider").value;
  const needsKey = provider === "gemini" || provider === "openai";
  $("apiWrap").style.display = needsKey ? "block" : "none";
  $("odBox").style.display = provider === "ondevice" ? "block" : "none";
  $("keyHint").textContent = KEY_HINTS[provider] || "";
  if (provider === "ondevice") refreshOnDeviceStatus();
}

const OD_MESSAGES = {
  available: { text: "On-device model is ready ✓", cls: "ok" },
  downloadable: { text: "Model available – it will download on first use (several GB).", cls: "warn" },
  downloading: { text: "Model is downloading…", cls: "warn" },
  unavailable: { text: "On-device model unavailable on this device/Chrome version. The extension will use general questions, or pick Gemini/OpenAI.", cls: "err" },
};

async function refreshOnDeviceStatus() {
  const el = $("odStatus");
  el.textContent = "Checking on-device model availability…";
  el.className = "od-status";
  try {
    const resp = await chrome.runtime.sendMessage({ type: "KRYTYKAI_OD_STATUS" });
    if (resp?.ok) {
      const info = OD_MESSAGES[resp.availability] || {
        text: `Model status: ${resp.availability}`,
        cls: "warn",
      };
      el.textContent = info.text;
      el.className = "od-status " + info.cls;
    } else {
      el.textContent = resp?.error || "Could not check model availability.";
      el.className = "od-status err";
    }
  } catch (err) {
    el.textContent = String(err?.message || err);
    el.className = "od-status err";
  }
}

async function load() {
  const s = await getSettings();
  $("provider").value = s.provider;
  $("apiKey").value = s.apiKey;
  $("geminiModel").value = s.geminiModel;
  $("openaiModel").value = s.openaiModel;
  $("enabled").checked = !!s.enabled;
  $("autoAnalyzeChat").checked = !!s.autoAnalyzeChat;
  $("numQuestions").value = s.numQuestions;
  applyProviderUI();
}

function readForm() {
  let n = parseInt($("numQuestions").value, 10);
  if (isNaN(n)) n = 4;
  n = Math.min(7, Math.max(1, n));
  return {
    provider: $("provider").value,
    apiKey: $("apiKey").value.trim(),
    geminiModel: $("geminiModel").value.trim() || "gemini-3.1-flash-lite",
    openaiModel: $("openaiModel").value.trim() || "gpt-4o-mini",
    enabled: $("enabled").checked,
    autoAnalyzeChat: $("autoAnalyzeChat").checked,
    numQuestions: n,
  };
}

function setStatus(text, cls = "") {
  const el = $("status");
  el.textContent = text;
  el.className = "status " + cls;
}

async function save() {
  const cur = await getSettings();
  const next = { ...cur, ...readForm() };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  setStatus("Saved ✓", "ok");
  setTimeout(() => setStatus(""), 2000);
}

async function test() {
  await save();
  setStatus("Testing…");
  try {
    const resp = await chrome.runtime.sendMessage({
      type: "KRYTYKAI_ANALYZE",
      payload: {
        userQuestion: "Is the Earth flat?",
        answerText: "No, the Earth is approximately spherical (an oblate spheroid).",
      },
    });
    if (resp?.ok) {
      const src = resp.result?.source;
      if (src === "heuristic" && resp.result?.warning) {
        setStatus(resp.result.warning, "err");
      } else if (src === "heuristic") {
        setStatus("Working in offline mode (no API).", "ok");
      } else {
        setStatus(`OK – response from: ${src}.`, "ok");
      }
    } else {
      setStatus(resp?.error || "Test failed.", "err");
    }
  } catch (err) {
    setStatus(String(err?.message || err), "err");
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "OD_DOWNLOAD_PROGRESS" && $("provider").value === "ondevice") {
    const pct = Math.round((msg.loaded || 0) * 100);
    const el = $("odStatus");
    el.textContent = `Downloading on-device model… ${pct}%`;
    el.className = "od-status warn";
  }
});

$("provider").addEventListener("change", applyProviderUI);
$("save").addEventListener("click", save);
$("test").addEventListener("click", test);
load();
