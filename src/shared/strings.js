// Teksty interfejsu Biblioteki. Język bierze się z ustawienia „App language",
// tak samo jak panel na stronie – inaczej użytkownik dostaje pół aplikacji po
// angielsku i pół po polsku.
//
// Języki bez własnego wpisu spadają na angielski (jak w content.js).
//
// UWAGA: to NIE jest moduł ES – patrz komentarz w catalog.js.

(() => {
  "use strict";

  const STRINGS = {
    en: {
      // Nagłówek
      libraryTitle: "Library",
      heroSubEmpty: "Set a language to learn in your profile",
      heroLevelAt: (lang, lvl) => `${lang} · level ${lvl}`,
      heroCefr: (lvl) => `Level ${lvl}`,
      xpToNext: (n) => `${n} XP to the next level`,
      xpMax: "top level",
      streakDays: (n) => (n === 1 ? "1 day in a row" : `${n} days in a row`),
      statDue: "due for review",
      statVocab: "words in the album",
      statMastered: "mastered",
      statLessons: "lessons in total",

      // Zakładki
      tabReview: "Reviews",
      tabVocab: "Vocabulary",
      tabCareer: "Coverage",
      tabHistory: "History",
      tabProfile: "Profile",
      groupLang: "Language",
      groupCareer: "Career",
      groupMore: "More",

      // Powtórki
      all: "All",
      showAnswer: "Show answer",
      flipHint: "click to reveal",
      notYet: "Not yet",
      known: "I know it ✓",
      inSession: (done, total) => `${done} / ${total} in this session`,
      fromSource: "from",
      emptyVocabTitle: "Your album is still empty",
      emptyVocabLangTitle: (lang) => `No words yet (${lang})`,
      emptyVocabBody:
        "Open any article and click 🗣️ Linglerno — words from the lesson land here automatically and come back as reviews.",
      allReviewedTitle: "Everything reviewed for today",
      allReviewedBody: (n, when) => `You have ${n} words in this set. The next one returns ${when}.`,
      inHours: (h) => `in ${h} h`,
      inDays: (d) => `in ${d} days`,
      now: "now",

      // Słownik
      sortRecent: "Newest",
      sortAlpha: "A–Z",
      sortBox: "Best known",
      deleteWord: "Delete",
      boxStage: (b, max) => `Review stage: ${b} of ${max}`,
      emptyDictTitle: "No words",
      emptyDictBody: "Every Linglerno lesson adds vocabulary and phrases here — no copying by hand.",

      // Kariera
      coverageLabel: "coverage of essential skills",
      coverageOptional: (a, b) => `Plus ${a} of ${b} optional skills.`,
      gapsTitle: (n) => `Gaps — not touched yet (${n})`,
      gapSearch: (s) => `Look for materials: ${s}`,
      gapsNone: "You have touched every essential skill for this occupation. 🎉",
      noOccupationTitle: "Set an occupation to measure progress",
      noOccupationBody:
        "Without one you only see how often you read about what. Pick an occupation from the ESCO classification and lessons map onto its official skills, showing how much you have covered.",
      pickOccupation: "Pick an occupation",
      touched: "What you have touched",
      recentLessons: "Recent lessons",
      lessonsCount: (n) => (n === 1 ? "1 lesson" : `${n} lessons`),
      emptyCareerTitle: "Your competence map is empty",
      emptyCareerBody:
        "Click 📖 My Career on any article. Each lesson records what it was about, so after a few weeks you can see where your time actually goes.",
      escoAttribution: "Occupations and skills: ESCO classification (European Commission).",

      // Historia
      emptyHistoryTitle: "No history",
      emptyHistoryBody:
        "Every lesson — language and career alike — lands here with a link to the page it came from.",
      today: "Today",
      yesterday: "Yesterday",

      // Profil
      occupationSection: "Occupation — defines the skills you measure progress against",
      occupationPlaceholder: "Type an occupation, e.g. plumber, data analyst…",
      search: "Search",
      change: "Change",
      searching: "Searching…",
      escoHint: "The occupation list comes from ESCO, the European classification of occupations and skills.",
      escoPickHint: "Pick the closest one — ESCO names can be bureaucratic.",
      escoNoHits: "No matches. Try another word.",
      escoFetching: "Fetching skills…",
      escoFetchError: (m) => `Could not fetch: ${m}`,
      escoSearchError: (m) => `Search error: ${m}`,
      skillCounts: (e, o, t) => `${e} essential skills, ${o} optional · ${t} in total`,
      careerSection: "Career — feeds the Career tab and 📖 My Career",
      languagesSection: "Languages — feed 🗣️ Linglerno and this page's theme",
      fieldRole: "Role / position",
      fieldIndustry: "Industry / field",
      fieldGoals: "Goals",
      fieldSkills: "Skills to develop",
      fieldInterests: "Interests",
      phRole: "e.g. data analyst",
      phIndustry: "e.g. medtech",
      phGoals: "e.g. build an EEG startup",
      phSkills: "e.g. SQL, negotiation (comma separated)",
      phInterests: "e.g. AI, running",
      yourLanguage: "Your language",
      learnLanguage: "Language you are learning",
      countryCulture: "Country / culture",
      phCountry: "e.g. Italy",
      levelLabel: "Level",
      pickOne: "— pick —",
      saveProfile: "Save profile",
      saved: "Saved ✓",
      profileSaved: "Profile saved",

      // Stopka
      localOnly: "Everything is stored locally in this browser — nothing goes to a server.",
      exportJson: "Export JSON",
      settings: "Settings",
      exported: "Exported",
      newBadge: (n) => `New badge: ${n}`,
    },

    pl: {
      libraryTitle: "Biblioteka",
      heroSubEmpty: "Ustaw język nauki w profilu",
      heroLevelAt: (lang, lvl) => `${lang} · poziom ${lvl}`,
      heroCefr: (lvl) => `Poziom ${lvl}`,
      xpToNext: (n) => `${n} XP do następnego poziomu`,
      xpMax: "poziom maksymalny",
      streakDays: (n) => (n === 1 ? "1 dzień z rzędu" : `${n} dni z rzędu`),
      statDue: "do powtórki",
      statVocab: "słówek w albumie",
      statMastered: "opanowanych",
      statLessons: "lekcji łącznie",

      tabReview: "Powtórki",
      tabVocab: "Słownik",
      tabCareer: "Pokrycie",
      tabHistory: "Historia",
      tabProfile: "Profil",
      groupLang: "Język",
      groupCareer: "Kariera",
      groupMore: "Więcej",

      all: "Wszystkie",
      showAnswer: "Pokaż odpowiedź",
      flipHint: "kliknij, aby odsłonić",
      notYet: "Jeszcze nie",
      known: "Wiem ✓",
      inSession: (done, total) => `${done} / ${total} w tej sesji`,
      fromSource: "z",
      emptyVocabTitle: "Album jest jeszcze pusty",
      emptyVocabLangTitle: (lang) => `Brak słówek (${lang})`,
      emptyVocabBody:
        "Otwórz dowolny artykuł i kliknij 🗣️ Linglerno — słówka z lekcji trafią tutaj automatycznie i wrócą do Ciebie w powtórkach.",
      allReviewedTitle: "Na dziś wszystko powtórzone",
      allReviewedBody: (n, when) => `Masz ${n} słówek w tym zestawie. Następne wraca ${when}.`,
      inHours: (h) => `za ${h} godz.`,
      inDays: (d) => `za ${d} dni`,
      now: "teraz",

      sortRecent: "Najnowsze",
      sortAlpha: "A–Z",
      sortBox: "Najlepiej znane",
      deleteWord: "Usuń",
      boxStage: (b, max) => `Etap powtórek: ${b} z ${max}`,
      emptyDictTitle: "Brak słówek",
      emptyDictBody: "Każda lekcja Linglerno dokłada tu słownictwo i zwroty — bez ręcznego przepisywania.",

      coverageLabel: "pokrycie umiejętności kluczowych",
      coverageOptional: (a, b) => `Dodatkowo ${a} z ${b} umiejętności opcjonalnych.`,
      gapsTitle: (n) => `Luki — czego jeszcze nie tknąłeś (${n})`,
      gapSearch: (s) => `Poszukaj materiałów: ${s}`,
      gapsNone: "Wszystkie umiejętności kluczowe tego zawodu masz już ruszone. 🎉",
      noOccupationTitle: "Ustaw zawód, żeby mierzyć postęp",
      noOccupationBody:
        "Bez zawodu widzisz tylko, jak często czytasz o czym. Po wybraniu zawodu z klasyfikacji ESCO lekcje mapują się na jego oficjalne umiejętności i widać, ile z nich pokryłeś.",
      pickOccupation: "Wybierz zawód",
      touched: "Czego dotknąłeś",
      recentLessons: "Ostatnie lekcje",
      lessonsCount: (n) => (n === 1 ? "1 lekcja" : `${n} lekcji`),
      emptyCareerTitle: "Mapa kompetencji jest pusta",
      emptyCareerBody:
        "Kliknij 📖 My Career na dowolnym artykule. Każda lekcja zapisuje, czego dotyczyła — po kilku tygodniach zobaczysz, w co naprawdę inwestujesz czas.",
      escoAttribution: "Zawody i umiejętności: klasyfikacja ESCO (Komisja Europejska).",

      emptyHistoryTitle: "Brak historii",
      emptyHistoryBody:
        "Tu wylądują wszystkie lekcje — językowe i karierowe — z linkiem do strony, z której powstały.",
      today: "Dzisiaj",
      yesterday: "Wczoraj",

      occupationSection: "Zawód — wyznacza umiejętności, po których mierzysz postęp",
      occupationPlaceholder: "Wpisz zawód, np. hydraulik, analityk danych…",
      search: "Szukaj",
      change: "Zmień",
      searching: "Szukam…",
      escoHint: "Lista zawodów pochodzi z ESCO — europejskiej klasyfikacji zawodów i umiejętności.",
      escoPickHint: "Wybierz najbliższy swojemu — nazwy w ESCO bywają urzędowe.",
      escoNoHits: "Brak trafień. Spróbuj innego słowa.",
      escoFetching: "Pobieram umiejętności…",
      escoFetchError: (m) => `Nie udało się pobrać: ${m}`,
      escoSearchError: (m) => `Błąd wyszukiwania: ${m}`,
      skillCounts: (e, o, t) => `${e} umiejętności kluczowych, ${o} opcjonalnych · ${t} łącznie`,
      careerSection: "Kariera — zasila zakładkę Kariera i tryb 📖 My Career",
      languagesSection: "Języki — zasilają 🗣️ Linglerno i motyw tej strony",
      fieldRole: "Rola / stanowisko",
      fieldIndustry: "Branża / dziedzina",
      fieldGoals: "Cele",
      fieldSkills: "Umiejętności do rozwoju",
      fieldInterests: "Zainteresowania",
      phRole: "np. analityk danych",
      phIndustry: "np. medtech",
      phGoals: "np. zbudować startup EEG",
      phSkills: "np. SQL, negocjacje (po przecinku)",
      phInterests: "np. AI, bieganie",
      yourLanguage: "Twój język",
      learnLanguage: "Język, którego się uczysz",
      countryCulture: "Kraj / kultura",
      phCountry: "np. Włochy",
      levelLabel: "Poziom",
      pickOne: "— wybierz —",
      saveProfile: "Zapisz profil",
      saved: "Zapisano ✓",
      profileSaved: "Profil zapisany",

      localOnly: "Wszystko zapisane lokalnie w tej przeglądarce — nic nie wychodzi na serwer.",
      exportJson: "Eksportuj JSON",
      settings: "Ustawienia",
      exported: "Wyeksportowano",
      newBadge: (n) => `Nowa odznaka: ${n}`,
    },
  };

  globalThis.KRYTYKAI_STRINGS = {
    STRINGS,
    /** Zwraca funkcję tłumaczącą dla danego języka (zapas: angielski). */
    forLang(lang) {
      const code = String(lang || "en").toLowerCase().slice(0, 2);
      const dict = STRINGS[code] || STRINGS.en;
      return (key, ...args) => {
        const v = dict[key] != null ? dict[key] : STRINGS.en[key];
        if (v == null) return key;
        return typeof v === "function" ? v(...args) : v;
      };
    },
  };
})();
