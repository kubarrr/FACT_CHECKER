// Katalog języków, poziomów, motywów i gamifikacji – przeniesiony z Lingvido.
//
// UWAGA: to NIE jest moduł ES. Content scripty w MV3 nie są modułami, a ten plik
// musi działać zarówno w content scripcie, jak i na stronach rozszerzenia
// (opcje, biblioteka). Dlatego eksportuje się przez globalne `KRYTYKAI_CATALOG`.

(() => {
  "use strict";

  // --- Motywy językowe ------------------------------------------------------
  // Paleta budowana z barw flagi danego kraju. Każdy token przekolorowuje cały
  // interfejs biblioteki (tło, tekst, karty, obramowania), nie tylko akcenty.
  function dark(s) {
    const h = s.hue;
    return {
      mode: "dark",
      hue: h,
      background: s.background || `oklch(0.17 0.03 ${h})`,
      foreground: s.foreground || `oklch(0.97 0.012 ${h})`,
      card: s.card || `oklch(0.22 0.035 ${h})`,
      muted: `oklch(0.25 0.035 ${h})`,
      mutedForeground: `oklch(0.72 0.03 ${h})`,
      border: `oklch(0.34 0.04 ${h})`,
      primary: s.primary || s.from,
      from: s.from,
      to: s.to,
      glow: `oklch(0.65 0.2 ${h} / 0.45)`,
    };
  }

  function light(s) {
    const h = s.hue;
    return {
      mode: "light",
      hue: h,
      background: s.background || `oklch(0.97 0.025 ${h})`,
      foreground: s.foreground || `oklch(0.28 0.08 ${h})`,
      card: s.card || `oklch(0.995 0.006 ${h})`,
      muted: `oklch(0.93 0.035 ${h})`,
      mutedForeground: `oklch(0.48 0.06 ${h})`,
      border: `oklch(0.85 0.04 ${h})`,
      primary: s.primary || s.from,
      from: s.from,
      to: s.to,
      glow: `oklch(0.6 0.18 ${h} / 0.32)`,
    };
  }

  const LANGUAGE_THEMES = {
    en: dark({ hue: 262, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.20 0.06 262)", card: "oklch(0.25 0.065 262)", primary: "oklch(0.64 0.22 25)" }),
    es: light({ hue: 40, from: "oklch(0.58 0.23 28)", to: "oklch(0.80 0.17 85)", background: "oklch(0.94 0.10 92)", card: "oklch(0.975 0.06 92)", foreground: "oklch(0.40 0.19 28)", primary: "oklch(0.55 0.23 28)" }),
    it: light({ hue: 150, from: "oklch(0.58 0.16 150)", to: "oklch(0.58 0.24 25)", background: "oklch(0.985 0.006 150)", card: "oklch(1 0 0)", foreground: "oklch(0.32 0.10 152)", primary: "oklch(0.50 0.15 150)" }),
    de: dark({ hue: 30, from: "oklch(0.56 0.23 25)", to: "oklch(0.80 0.17 88)", background: "oklch(0.12 0.012 40)", primary: "oklch(0.64 0.22 30)" }),
    fr: light({ hue: 262, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.975 0.012 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.48 0.19 262)" }),
    pt: light({ hue: 150, from: "oklch(0.50 0.16 150)", to: "oklch(0.58 0.24 25)", background: "oklch(0.96 0.03 150)", foreground: "oklch(0.30 0.10 150)", primary: "oklch(0.48 0.15 150)" }),
    pl: light({ hue: 25, from: "oklch(0.60 0.23 25)", to: "oklch(0.70 0.18 20)", background: "oklch(0.985 0.004 25)", foreground: "oklch(0.30 0.06 25)", primary: "oklch(0.57 0.23 25)" }),
    ja: light({ hue: 18, from: "oklch(0.58 0.24 18)", to: "oklch(0.68 0.18 15)", background: "oklch(0.99 0.003 18)", foreground: "oklch(0.26 0.04 18)", primary: "oklch(0.56 0.24 18)" }),
    zh: dark({ hue: 30, from: "oklch(0.58 0.24 25)", to: "oklch(0.82 0.17 88)", background: "oklch(0.21 0.09 28)", card: "oklch(0.26 0.10 28)", primary: "oklch(0.80 0.16 78)" }),
    ko: light({ hue: 250, from: "oklch(0.52 0.20 255)", to: "oklch(0.58 0.24 22)", background: "oklch(0.985 0.006 250)", foreground: "oklch(0.28 0.07 250)", primary: "oklch(0.52 0.19 252)" }),
    ru: light({ hue: 262, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.98 0.008 262)", foreground: "oklch(0.30 0.09 262)", primary: "oklch(0.50 0.19 262)" }),
    ar: dark({ hue: 155, from: "oklch(0.55 0.15 155)", to: "oklch(0.72 0.15 150)", background: "oklch(0.21 0.06 155)", card: "oklch(0.26 0.07 155)", primary: "oklch(0.74 0.15 152)" }),
    uk: dark({ hue: 250, from: "oklch(0.52 0.18 255)", to: "oklch(0.83 0.17 90)", background: "oklch(0.22 0.08 255)", card: "oklch(0.27 0.09 255)", primary: "oklch(0.84 0.17 88)" }),
    nl: light({ hue: 255, from: "oklch(0.58 0.20 25)", to: "oklch(0.66 0.17 50)", background: "oklch(0.98 0.012 50)", foreground: "oklch(0.30 0.08 255)", primary: "oklch(0.62 0.18 45)" }),
    sv: dark({ hue: 250, from: "oklch(0.52 0.18 255)", to: "oklch(0.84 0.17 90)", background: "oklch(0.22 0.08 255)", card: "oklch(0.27 0.09 255)", primary: "oklch(0.84 0.17 90)" }),
    no: light({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.975 0.012 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.52 0.20 262)" }),
    da: light({ hue: 25, from: "oklch(0.58 0.23 25)", to: "oklch(0.70 0.18 20)", background: "oklch(0.985 0.006 25)", foreground: "oklch(0.32 0.08 25)", primary: "oklch(0.57 0.23 25)" }),
    fi: light({ hue: 255, from: "oklch(0.52 0.18 255)", to: "oklch(0.64 0.14 255)", background: "oklch(0.985 0.008 255)", foreground: "oklch(0.30 0.09 255)", primary: "oklch(0.52 0.18 255)" }),
    is: light({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.98 0.01 255)", foreground: "oklch(0.30 0.10 255)", primary: "oklch(0.52 0.19 262)" }),
    cs: light({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.98 0.01 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.56 0.22 25)" }),
    sk: light({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.98 0.01 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.52 0.19 262)" }),
    hu: light({ hue: 25, from: "oklch(0.58 0.23 25)", to: "oklch(0.55 0.16 150)", background: "oklch(0.98 0.012 60)", foreground: "oklch(0.32 0.09 25)", primary: "oklch(0.56 0.21 28)" }),
    ro: light({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.98 0.02 90)", foreground: "oklch(0.30 0.10 255)", primary: "oklch(0.70 0.17 85)" }),
    bg: light({ hue: 150, from: "oklch(0.52 0.16 150)", to: "oklch(0.58 0.24 25)", background: "oklch(0.97 0.02 150)", foreground: "oklch(0.30 0.10 150)", primary: "oklch(0.50 0.16 150)" }),
    el: light({ hue: 255, from: "oklch(0.50 0.18 255)", to: "oklch(0.64 0.15 255)", background: "oklch(0.98 0.012 255)", foreground: "oklch(0.30 0.10 255)", primary: "oklch(0.52 0.19 255)" }),
    tr: light({ hue: 25, from: "oklch(0.56 0.23 25)", to: "oklch(0.66 0.18 22)", background: "oklch(0.98 0.012 25)", foreground: "oklch(0.34 0.10 25)", primary: "oklch(0.56 0.23 25)" }),
    hr: light({ hue: 25, from: "oklch(0.56 0.23 25)", to: "oklch(0.52 0.20 262)", background: "oklch(0.98 0.01 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.56 0.22 25)" }),
    sr: dark({ hue: 262, from: "oklch(0.50 0.20 262)", to: "oklch(0.56 0.23 25)", background: "oklch(0.20 0.06 262)", card: "oklch(0.25 0.065 262)", primary: "oklch(0.62 0.22 25)" }),
    sl: light({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.58 0.24 25)", background: "oklch(0.98 0.01 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.52 0.19 262)" }),
    lt: light({ hue: 120, from: "oklch(0.58 0.17 150)", to: "oklch(0.80 0.17 88)", background: "oklch(0.98 0.02 95)", foreground: "oklch(0.32 0.10 150)", primary: "oklch(0.58 0.16 150)" }),
    lv: light({ hue: 20, from: "oklch(0.45 0.16 25)", to: "oklch(0.55 0.15 25)", background: "oklch(0.98 0.01 25)", foreground: "oklch(0.32 0.10 25)", primary: "oklch(0.45 0.17 25)" }),
    et: light({ hue: 255, from: "oklch(0.50 0.18 255)", to: "oklch(0.64 0.14 255)", background: "oklch(0.98 0.012 255)", foreground: "oklch(0.30 0.09 255)", primary: "oklch(0.52 0.18 255)" }),
    hi: light({ hue: 50, from: "oklch(0.66 0.18 50)", to: "oklch(0.55 0.16 150)", background: "oklch(0.98 0.02 60)", foreground: "oklch(0.34 0.10 45)", primary: "oklch(0.64 0.18 50)" }),
    bn: dark({ hue: 150, from: "oklch(0.52 0.16 150)", to: "oklch(0.56 0.23 25)", background: "oklch(0.20 0.06 155)", card: "oklch(0.25 0.07 155)", primary: "oklch(0.60 0.17 150)" }),
    th: light({ hue: 255, from: "oklch(0.56 0.23 25)", to: "oklch(0.50 0.20 262)", background: "oklch(0.98 0.01 255)", foreground: "oklch(0.30 0.10 262)", primary: "oklch(0.50 0.20 262)" }),
    vi: dark({ hue: 28, from: "oklch(0.56 0.24 25)", to: "oklch(0.82 0.17 88)", background: "oklch(0.21 0.09 28)", card: "oklch(0.26 0.10 28)", primary: "oklch(0.82 0.17 85)" }),
    id: light({ hue: 25, from: "oklch(0.58 0.23 25)", to: "oklch(0.68 0.18 22)", background: "oklch(0.985 0.006 25)", foreground: "oklch(0.32 0.08 25)", primary: "oklch(0.57 0.23 25)" }),
    ms: dark({ hue: 255, from: "oklch(0.50 0.20 262)", to: "oklch(0.82 0.17 90)", background: "oklch(0.21 0.07 255)", card: "oklch(0.26 0.08 255)", primary: "oklch(0.82 0.17 90)" }),
    he: light({ hue: 255, from: "oklch(0.50 0.18 255)", to: "oklch(0.64 0.15 255)", background: "oklch(0.985 0.01 255)", foreground: "oklch(0.30 0.10 255)", primary: "oklch(0.52 0.18 255)" }),
    fa: light({ hue: 150, from: "oklch(0.52 0.16 150)", to: "oklch(0.56 0.23 25)", background: "oklch(0.97 0.02 150)", foreground: "oklch(0.30 0.10 150)", primary: "oklch(0.50 0.16 150)" }),
  };

  const LANGUAGES = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "pl", name: "Polski", flag: "🇵🇱" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "uk", name: "Українська", flag: "🇺🇦" },
    { code: "nl", name: "Nederlands", flag: "🇳🇱" },
    { code: "sv", name: "Svenska", flag: "🇸🇪" },
    { code: "no", name: "Norsk", flag: "🇳🇴" },
    { code: "da", name: "Dansk", flag: "🇩🇰" },
    { code: "fi", name: "Suomi", flag: "🇫🇮" },
    { code: "is", name: "Íslenska", flag: "🇮🇸" },
    { code: "cs", name: "Čeština", flag: "🇨🇿" },
    { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
    { code: "hu", name: "Magyar", flag: "🇭🇺" },
    { code: "ro", name: "Română", flag: "🇷🇴" },
    { code: "bg", name: "Български", flag: "🇧🇬" },
    { code: "el", name: "Ελληνικά", flag: "🇬🇷" },
    { code: "tr", name: "Türkçe", flag: "🇹🇷" },
    { code: "hr", name: "Hrvatski", flag: "🇭🇷" },
    { code: "sr", name: "Српски", flag: "🇷🇸" },
    { code: "sl", name: "Slovenščina", flag: "🇸🇮" },
    { code: "lt", name: "Lietuvių", flag: "🇱🇹" },
    { code: "lv", name: "Latviešu", flag: "🇱🇻" },
    { code: "et", name: "Eesti", flag: "🇪🇪" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "bn", name: "বাংলা", flag: "🇧🇩" },
    { code: "th", name: "ไทย", flag: "🇹🇭" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
    { code: "he", name: "עברית", flag: "🇮🇱" },
    { code: "fa", name: "فارسی", flag: "🇮🇷" },
  ];

  // Angielskie nazwy języków trafiają do promptu (model rozumie je najlepiej).
  const ENGLISH_NAMES = {
    en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
    pt: "Portuguese", pl: "Polish", ja: "Japanese", zh: "Chinese", ko: "Korean",
    ru: "Russian", ar: "Arabic", uk: "Ukrainian", nl: "Dutch", sv: "Swedish",
    no: "Norwegian", da: "Danish", fi: "Finnish", is: "Icelandic", cs: "Czech",
    sk: "Slovak", hu: "Hungarian", ro: "Romanian", bg: "Bulgarian", el: "Greek",
    tr: "Turkish", hr: "Croatian", sr: "Serbian", sl: "Slovenian", lt: "Lithuanian",
    lv: "Latvian", et: "Estonian", hi: "Hindi", bn: "Bengali", th: "Thai",
    vi: "Vietnamese", id: "Indonesian", ms: "Malay", he: "Hebrew", fa: "Persian",
  };

  const LEVELS = [
    { code: "A1", label: "A1 — Beginner", description: "Pierwsze słowa i zwroty" },
    { code: "A2", label: "A2 — Elementary", description: "Podstawowa komunikacja" },
    { code: "B1", label: "B1 — Intermediate", description: "Codzienne sytuacje" },
    { code: "B2", label: "B2 — Upper-Intermediate", description: "Złożone tematy" },
    { code: "C1", label: "C1 — Advanced", description: "Swobodna wypowiedź" },
    { code: "C2", label: "C2 — Mastery", description: "Poziom zbliżony do rodzimego" },
  ];

  // --- Gamifikacja ----------------------------------------------------------
  const XP_PER_LESSON = 10;
  const XP_STREAK_BONUS = 10;
  const XP_PER_REVIEW_CORRECT = 5;

  const XP_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000];
  const LEVEL_NAMES = ["Ziarno", "Kiełek", "Liść", "Gałąź", "Drzewo", "Las", "Legenda"];

  function getUserAppLevel(xp) {
    let level = 0;
    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= XP_THRESHOLDS[i]) { level = i; break; }
    }
    const current = XP_THRESHOLDS[level];
    const next = XP_THRESHOLDS[level + 1];
    // Na ostatnim progu nie ma już „następnego" – pasek zostaje pełny.
    const progress = next ? ((xp - current) / (next - current)) * 100 : 100;
    return { level, name: LEVEL_NAMES[level], progress: Math.min(progress, 100), next: next || current };
  }

  const BADGES = [
    { id: "first_lesson", name: "Pierwszy krok", description: "Pierwsza zapisana lekcja", icon: "🌱", condition: (s) => s.lessons_count >= 1 },
    { id: "streak_3", name: "Rozpęd", description: "3 dni z rzędu", icon: "🔥", condition: (s) => s.streak >= 3 },
    { id: "streak_7", name: "Tydzień formy", description: "7 dni z rzędu", icon: "⚡", condition: (s) => s.streak >= 7 },
    { id: "streak_30", name: "Mistrz miesiąca", description: "30 dni z rzędu", icon: "💎", condition: (s) => s.streak >= 30 },
    { id: "lessons_10", name: "Odkrywca", description: "10 lekcji", icon: "🗺️", condition: (s) => s.lessons_count >= 10 },
    { id: "lessons_50", name: "Podróżnik", description: "50 lekcji", icon: "🏆", condition: (s) => s.lessons_count >= 50 },
    { id: "vocab_100", name: "Kolekcjoner słów", description: "100 słówek w albumie", icon: "📚", condition: (s) => s.vocab_count >= 100 },
    { id: "reviews_100", name: "Powtórkowicz", description: "100 powtórek", icon: "🔁", condition: (s) => s.reviews_done >= 100 },
    { id: "xp_1000", name: "Łowca XP", description: "1000 XP", icon: "⭐", condition: (s) => s.xp >= 1000 },
  ];

  function findLanguage(code) {
    return LANGUAGES.find((l) => l.code === code) || null;
  }

  // Wcześniejsze wersje trzymały język jako wolny tekst („Polish", „Italiano").
  // Mapujemy go na kod, żeby nikt nie stracił konfiguracji po aktualizacji.
  function codeFromLegacyName(name) {
    const n = String(name || "").trim().toLowerCase();
    if (!n) return "";
    const byEnglish = Object.entries(ENGLISH_NAMES).find(([, v]) => v.toLowerCase() === n);
    if (byEnglish) return byEnglish[0];
    const byNative = LANGUAGES.find((l) => l.name.toLowerCase() === n);
    return byNative ? byNative.code : "";
  }

  function themeFor(code) {
    return LANGUAGE_THEMES[code] || LANGUAGE_THEMES.en;
  }

  // Nakłada motyw języka na element jako zmienne CSS (--k-*).
  function applyTheme(el, code) {
    const t = themeFor(code);
    const map = {
      "--k-bg": t.background,
      "--k-fg": t.foreground,
      "--k-card": t.card,
      "--k-muted": t.muted,
      "--k-muted-fg": t.mutedForeground,
      "--k-border": t.border,
      "--k-primary": t.primary,
      "--k-from": t.from,
      "--k-to": t.to,
      "--k-glow": t.glow,
    };
    for (const [k, v] of Object.entries(map)) el.style.setProperty(k, v);
    el.dataset.themeMode = t.mode;
    return t;
  }

  globalThis.KRYTYKAI_CATALOG = {
    LANGUAGES,
    ENGLISH_NAMES,
    LEVELS,
    LANGUAGE_THEMES,
    BADGES,
    XP_PER_LESSON,
    XP_STREAK_BONUS,
    XP_PER_REVIEW_CORRECT,
    XP_THRESHOLDS,
    LEVEL_NAMES,
    getUserAppLevel,
    findLanguage,
    codeFromLegacyName,
    themeFor,
    applyTheme,
  };
})();
