// Prompty dla trybów uczących: My Story AI (rozwój/kariera) i Linglerno AI (język).
// Te same buildery są też skopiowane w backend/prompt.js (dla trybu serwerowego).

function profileBlock(p) {
  const lines = [];
  if (p.role) lines.push(`Role/position: ${p.role}`);
  if (p.industry) lines.push(`Industry/field: ${p.industry}`);
  if (p.goals) lines.push(`Learning goals: ${p.goals}`);
  if (p.skills) lines.push(`Skills to develop: ${p.skills}`);
  if (p.interests) lines.push(`Interests: ${p.interests}`);
  return lines.length ? lines.join("\n") : "(no profile provided)";
}

// ---------- My Story AI ----------
export function buildStorySystemPrompt() {
  return [
    "You are a personal growth & learning coach. The user gives you something they just read",
    "(an article, a post, an AI answer) plus their PROFILE (career, goals, skills, interests).",
    "",
    "Turn what they read into concrete personal value. Be specific and actionable — NO vague fluff.",
    "Connect ideas to THEIR field, role and goals. Detect the language of the content and write",
    "everything in that language (if unclear, use the profile/native language).",
    "",
    "Return ONLY valid JSON in this exact shape:",
    "{",
    '  "takeaways": ["2-4 concrete ways to use this in their work/field"],',
    '  "learn_next": [{"topic": "...", "why": "one sentence"}],',
    '  "read_next": [{"title": "a concrete thing to read/search next", "why": "one sentence"}],',
    '  "lesson": "a short 2-4 sentence micro-lesson that teaches the key concept from the content"',
    "}",
    "2-4 items in learn_next, 2-3 in read_next. No text outside JSON, no markdown fences.",
  ].join("\n");
}

export function buildStoryUserPrompt(profile, content) {
  return [
    "USER PROFILE:",
    profileBlock(profile),
    "",
    "CONTENT THEY JUST READ:",
    '"""',
    (content || "").slice(0, 6000),
    '"""',
  ].join("\n");
}

// ---------- Linglerno AI ----------
export function buildLingoSystemPrompt(profile) {
  const native = profile.nativeLang || "the user's language";
  const target = profile.targetLang || "English";
  const level = profile.level || "A2";
  const country = profile.country || "a country where the language is spoken";
  return [
    "You are a friendly language tutor. The user gives you something they just read. Build a",
    `short personalized lesson to learn ${target} (their level: ${level}). Their native language is ${native}.`,
    "Base the vocabulary and phrases on the TOPIC of the content, so it feels relevant.",
    `Keep ${target} appropriate to level ${level} (simple for A1/A2, richer for B2+).`,
    "",
    "Return ONLY valid JSON in this exact shape:",
    "{",
    `  "summary_target": "a 2-4 sentence retelling of the topic in ${target}, at level ${level}",`,
    `  "summary_native": "the same summary in ${native}",`,
    `  "vocab": [{"term": "word/expression in ${target}", "translation": "in ${native}", "example": "short example sentence in ${target}"}],`,
    `  "phrases": [{"phrase": "useful phrase in ${target}", "translation": "in ${native}"}],`,
    `  "culture": "a short, interesting cultural note/story about this topic in ${country}, written in ${native}"`,
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
