// Stabilny, anonimowy identyfikator urządzenia (limity po stronie backendu).
function deviceId() {
  let id = localStorage.getItem("factchecker_device_id");
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `d${Date.now()}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("factchecker_device_id", id);
  }
  return id;
}

// Wspólny kanał do Workera: te same nagłówki i ta sama obsługa błędów dla
// wszystkich trybów – różni je wyłącznie treść żądania.
async function postToBackend(endpoint, body) {
  const url = endpoint.replace(/\/+$/, "");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": deviceId() },
    body: JSON.stringify(body),
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

// Wywołanie Twojego backendu (Cloudflare Worker). Klucz API jest po stronie serwera.
export async function analyzeWithBackend({ endpoint, userQuestion, answerText, numQuestions, language }) {
  return postToBackend(endpoint, {
    userQuestion: userQuestion || "",
    answerText,
    numQuestions,
    language,
  });
}

// Tryby uczące (My Story / Linglerno) przez backend – prompt budowany po stronie serwera.
export async function learnWithBackend({ endpoint, mode, profile, answerText, language }) {
  return postToBackend(endpoint, { mode, profile: profile || {}, answerText, language });
}

// Odpowiedź na pytanie do sprawdzanego tekstu – bez wychodzenia z aplikacji.
export async function askWithBackend({ endpoint, question, answerText, language }) {
  return postToBackend(endpoint, { mode: "ask", question, answerText, language });
}
