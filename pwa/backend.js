// Stabilny, anonimowy identyfikator urządzenia (limity po stronie backendu).
function deviceId() {
  let id = localStorage.getItem("factchecker_device_id");
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `d${Date.now()}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("factchecker_device_id", id);
  }
  return id;
}

// Wywołanie Twojego backendu (Cloudflare Worker). Klucz API jest po stronie serwera.
export async function analyzeWithBackend({ endpoint, userQuestion, answerText, numQuestions, language }) {
  const url = endpoint.replace(/\/+$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": deviceId() },
    body: JSON.stringify({ userQuestion: userQuestion || "", answerText, numQuestions, language }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.error || j.detail || "";
    } catch {}
    if (res.status === 429) throw new Error(detail || "Rate limit – spróbuj później.");
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return res.json();
}

// Tryby uczące (My Story / Linglerno) przez backend – prompt budowany po stronie serwera.
export async function learnWithBackend({ endpoint, mode, profile, answerText, language }) {
  const url = endpoint.replace(/\/+$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": deviceId() },
    body: JSON.stringify({ mode, profile: profile || {}, answerText, language }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.error || j.detail || "";
    } catch {}
    if (res.status === 429) throw new Error(detail || "Rate limit – spróbuj później.");
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return res.json();
}
