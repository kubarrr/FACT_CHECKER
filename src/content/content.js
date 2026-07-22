(() => {
  "use strict";

  const STORAGE_KEY = "krytykai_settings";
  const DEFAULTS = { enabled: true, autoAnalyzeChat: false };

  // --- i18n interfejsu (etykiety UI) ----------------------------------------
  // Analiza (podsumowanie, ocena, pytania) jest w języku treści; poniżej tylko
  // stałe etykiety panelu, tłumaczone wg języka przeglądarki (domyślnie EN).
  const I18N = {
    en: { launcher: "Fact Check", title: "Fact Checker AI", close: "Close", copy: "Copy", copied: "Copied", ask: "Ask Gemini", loading: "Analyzing…", noAnswer: "No AI answer found on this page. Wait until the chat finishes responding.", selectFirst: "Select some text to verify first.", ctx: "The extension was reloaded or updated, and this tab still uses the old version.", reload: "Reload page", riskHigh: "High risk – be careful", riskMed: "Medium risk", riskLow: "Low risk – looks credible", kindVerify: "verify", kindExplore: "explore", kindPerspective: "other side", noQuestions: "No questions.", reverseSearch: "Reverse search:", sources: "Sources (from the web)", tabFact: "Fact Check", tabStory: "My Story", tabLingo: "Linglerno", takeaways: "How to use this", learnNext: "Learn next", readNext: "Read next", lesson: "Micro-lesson", summaryTarget: "Summary", summaryNative: "In your language", vocab: "Vocabulary", phrases: "Useful phrases", culture: "Culture note", openOptions: "Open settings", searchGoogle: "Search Google", verifyWith: "Verify:", course: "Course / video", posNoun: "noun", posVerb: "verb", posOther: "adjective / other", library: "Library", wordsSaved: "words saved", dueNow: "Due for review", checkSources: "🌐 Verify against sources", checkSourcesHint: "Searches the web and shows the real sources it relied on." },
    pl: { launcher: "Sprawdź", title: "Fact Checker AI", close: "Zamknij", copy: "Kopiuj", copied: "Skopiowano", ask: "Zapytaj w Gemini", loading: "Analizuję…", noAnswer: "Nie znalazłem odpowiedzi AI na tej stronie. Poczekaj, aż czat zakończy odpowiedź.", selectFirst: "Zaznacz najpierw fragment tekstu do weryfikacji.", ctx: "Rozszerzenie zostało przeładowane lub zaktualizowane, a ta karta wciąż korzysta ze starej wersji.", reload: "Odśwież stronę", riskHigh: "Wysokie ryzyko – zachowaj ostrożność", riskMed: "Średnie ryzyko", riskLow: "Niskie ryzyko – wygląda wiarygodnie", kindVerify: "weryfikacja", kindExplore: "ciekawostka", kindPerspective: "druga strona", noQuestions: "Brak pytań.", reverseSearch: "Wyszukiwanie wsteczne:", sources: "Źródła (z internetu)", tabFact: "Fakty", tabStory: "Moja Historia", tabLingo: "Linglerno", takeaways: "Jak to wykorzystać", learnNext: "Czego się nauczyć", readNext: "Co przeczytać dalej", lesson: "Mini-lekcja", summaryTarget: "Streszczenie", summaryNative: "W Twoim języku", vocab: "Słownictwo", phrases: "Przydatne zwroty", culture: "Ciekawostka kulturowa", openOptions: "Otwórz ustawienia", searchGoogle: "Szukaj w Google", verifyWith: "Zweryfikuj:", course: "Kurs / wideo", posNoun: "rzeczownik", posVerb: "czasownik", posOther: "przymiotnik / inne", library: "Biblioteka", wordsSaved: "słówek zapisanych", dueNow: "Do powtórki", checkSources: "🌐 Sprawdź w źródłach", checkSourcesHint: "Przeszuka internet i pokaże realne źródła, na których się oparł." },
    es: { launcher: "Verificar", title: "Fact Checker AI", close: "Cerrar", copy: "Copiar", copied: "Copiado", ask: "Preguntar a Gemini", loading: "Analizando…", noAnswer: "No se encontró respuesta de IA en esta página. Espera a que el chat termine.", selectFirst: "Selecciona primero un texto para verificar.", ctx: "La extensión se recargó o actualizó y esta pestaña usa la versión anterior.", reload: "Recargar página", riskHigh: "Riesgo alto – ten cuidado", riskMed: "Riesgo medio", riskLow: "Riesgo bajo – parece creíble", kindVerify: "verificación", kindExplore: "curiosidad", kindPerspective: "otra parte", noQuestions: "Sin preguntas." },
    de: { launcher: "Prüfen", title: "Fact Checker AI", close: "Schließen", copy: "Kopieren", copied: "Kopiert", ask: "Gemini fragen", loading: "Analysiere…", noAnswer: "Keine KI-Antwort auf dieser Seite gefunden. Warte, bis der Chat fertig ist.", selectFirst: "Markiere zuerst einen Text zur Überprüfung.", ctx: "Die Erweiterung wurde neu geladen oder aktualisiert; dieser Tab nutzt noch die alte Version.", reload: "Seite neu laden", riskHigh: "Hohes Risiko – Vorsicht", riskMed: "Mittleres Risiko", riskLow: "Geringes Risiko – wirkt glaubwürdig", kindVerify: "Prüfung", kindExplore: "Vertiefung", kindPerspective: "andere Seite", noQuestions: "Keine Fragen." },
    fr: { launcher: "Vérifier", title: "Fact Checker AI", close: "Fermer", copy: "Copier", copied: "Copié", ask: "Demander à Gemini", loading: "Analyse…", noAnswer: "Aucune réponse d'IA trouvée sur cette page. Attends la fin de la réponse.", selectFirst: "Sélectionne d'abord un texte à vérifier.", ctx: "L'extension a été rechargée ou mise à jour, et cet onglet utilise l'ancienne version.", reload: "Recharger la page", riskHigh: "Risque élevé – prudence", riskMed: "Risque moyen", riskLow: "Risque faible – semble crédible", kindVerify: "vérification", kindExplore: "découverte", kindPerspective: "autre point de vue", noQuestions: "Aucune question." },
  };
  // Język UI/odpowiedzi = język aplikacji z ustawień (ustawiany w init).
  // Domyślnie język przeglądarki, dopóki nie wczytamy ustawień.
  let activeLang = (navigator.language || "en").slice(0, 2).toLowerCase();
  let T = I18N[activeLang] || I18N.en;
  function setActiveLang(code) {
    const c = String(code || "").toLowerCase().slice(0, 2);
    if (c) activeLang = c;
    T = I18N[activeLang] || I18N.en;
  }
  // Fallback do EN dla kluczy, których dany język nie ma.
  function tr(k) {
    return T[k] != null ? T[k] : I18N.en[k] != null ? I18N.en[k] : k;
  }

  // Tłumaczenia typu treści (model zwraca kanoniczne EN: fact/opinion/…).
  const TYPE_I18N = {
    en: { fact: "fact", opinion: "opinion", clickbait: "clickbait", mixed: "mixed content", uncertain: "uncertain" },
    pl: { fact: "fakt", opinion: "opinia", clickbait: "clickbait", mixed: "treść mieszana", uncertain: "niepewne" },
    es: { fact: "hecho", opinion: "opinión", clickbait: "clickbait", mixed: "contenido mixto", uncertain: "incierto" },
    de: { fact: "Fakt", opinion: "Meinung", clickbait: "Clickbait", mixed: "gemischt", uncertain: "unsicher" },
    fr: { fact: "fait", opinion: "opinion", clickbait: "clickbait", mixed: "contenu mixte", uncertain: "incertain" },
  };
  function typeLabel(type) {
    const key = String(type || "").toLowerCase().trim();
    const dict = TYPE_I18N[activeLang] || TYPE_I18N.en;
    return dict[key] || TYPE_I18N.en[key] || type;
  }
  // Aktywny tryb panelu: "factcheck" | "story" | "lingo".
  let currentMode = "factcheck";

  // --- Wykrywanie serwisu i selektory ---------------------------------------
  const SITES = {
    chatgpt: {
      match: /(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/,
      answer: '[data-message-author-role="assistant"]',
      question: '[data-message-author-role="user"]',
    },
    gemini: {
      match: /(^|\.)gemini\.google\.com$/,
      answer: ".model-response-text, message-content",
      question: ".query-text, user-query",
    },
    claude: {
      match: /(^|\.)claude\.ai$/,
      answer: ".font-claude-message",
      question: '[data-testid="user-message"]',
    },
  };

  function detectSite() {
    const host = location.hostname;
    for (const [name, cfg] of Object.entries(SITES)) {
      if (cfg.match.test(host)) return { name, cfg };
    }
    return { name: "generic", cfg: null };
  }

  const SITE = detectSite();

  // --- Ekstrakcja treści -----------------------------------------------------
  function lastText(selector) {
    if (!selector) return "";
    const nodes = document.querySelectorAll(selector);
    if (!nodes.length) return "";
    return (nodes[nodes.length - 1].innerText || "").trim();
  }

  function extractChat() {
    return {
      userQuestion: lastText(SITE.cfg?.question),
      answerText: lastText(SITE.cfg?.answer),
    };
  }

  function extractSelection() {
    return (window.getSelection()?.toString() || "").trim();
  }

  function extractArticle() {
    const sel = extractSelection();
    if (sel.length > 40) return sel;
    const container = articleContainer();
    return (container?.innerText || "").trim().slice(0, 8000);
  }

  function articleContainer() {
    return (
      document.querySelector("article") || document.querySelector("main") || document.body
    );
  }

  function lastNode(selector) {
    if (!selector) return null;
    const nodes = document.querySelectorAll(selector);
    return nodes.length ? nodes[nodes.length - 1] : null;
  }

  // Element strony, na którym podświetlamy sporne fragmenty (flags).
  function sourceElForMode(mode) {
    if (mode === "chat") return lastNode(SITE.cfg?.answer);
    if (mode === "selection") return null; // zaznaczenie nie jest stabilnym elementem
    return articleContainer();
  }

  // --- UI --------------------------------------------------------------------
  let panelEl = null;
  let launcherEl = null;

  const LAUNCHER_POS_KEY = "krytykai_launcher_pos";

  // Trzy przyciski trybów tworzące jeden przeciągany blok.
  const LAUNCHER_MODES = [
    { mode: "factcheck", cls: "fact", emoji: "🔍", label: "Fact Checker AI" },
    { mode: "story", cls: "story", emoji: "📖", label: "My Career AI" },
    { mode: "lingo", cls: "lingo", emoji: "🗣️", label: "Linglerno AI" },
  ];

  function ensureLauncher() {
    if (launcherEl) return;
    launcherEl = document.createElement("div");
    launcherEl.className = "krytykai-launcher-group";
    for (const m of LAUNCHER_MODES) {
      const btn = document.createElement("button");
      btn.className = `krytykai-lbtn krytykai-lbtn-${m.cls}`;
      btn.title = m.label;
      btn.dataset.mode = m.mode;
      btn.innerHTML = `<span class="krytykai-lbtn-emoji">${m.emoji}</span><span class="krytykai-lbtn-label">${escapeHtml(
        m.label
      )}</span>`;
      launcherEl.appendChild(btn);
    }
    makeLauncherDraggable(launcherEl);
    document.documentElement.appendChild(launcherEl);
    restoreLauncherPos(launcherEl);
  }

  function activateMode(mode) {
    currentMode = mode;
    setPanelHeader(mode);
    if (mode === "factcheck") runAnalysis({ mode: sourceMode() });
    else runLearn(mode);
  }

  // Ustawia tytuł i kolor nagłówka osobnego okna danego trybu.
  function setPanelHeader(mode) {
    ensurePanel();
    const m = LAUNCHER_MODES.find((x) => x.mode === mode) || LAUNCHER_MODES[0];
    const header = panelEl.querySelector(".krytykai-header");
    if (header) header.className = `krytykai-header krytykai-header-${m.cls}`;
    const title = panelEl.querySelector(".krytykai-title");
    if (title) title.textContent = `${m.emoji} ${m.label}`;
  }

  function makeLauncherDraggable(el) {
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const origLeft = rect.left;
      const origTop = rect.top;
      // Przycisk, na którym rozpoczęto interakcję – użyty przy zwykłym kliknięciu.
      const downBtn = e.target.closest?.(".krytykai-lbtn") || null;
      let dragging = false;
      try { el.setPointerCapture(e.pointerId); } catch {}

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) < 5) return; // próg, by nie mylić z klikiem
        dragging = true;
        const maxLeft = window.innerWidth - el.offsetWidth;
        const maxTop = window.innerHeight - el.offsetHeight;
        const left = Math.min(Math.max(0, origLeft + dx), Math.max(0, maxLeft));
        const top = Math.min(Math.max(0, origTop + dy), Math.max(0, maxTop));
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.right = "auto";
        el.style.bottom = "auto";
      };
      const onUp = () => {
        try { el.releasePointerCapture(e.pointerId); } catch {}
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        if (dragging) {
          try {
            localStorage.setItem(
              LAUNCHER_POS_KEY,
              JSON.stringify({ left: el.style.left, top: el.style.top })
            );
          } catch {}
        } else if (downBtn && downBtn.dataset.mode) {
          // Zwykłe kliknięcie (bez przeciągania) – uruchom tryb przycisku.
          activateMode(downBtn.dataset.mode);
        }
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    });
  }

  function restoreLauncherPos(el) {
    try {
      const raw = localStorage.getItem(LAUNCHER_POS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p && p.left && p.top) {
        el.style.left = p.left;
        el.style.top = p.top;
        el.style.right = "auto";
        el.style.bottom = "auto";
      }
    } catch {}
  }

  function ensurePanel() {
    if (panelEl) return panelEl;
    panelEl = document.createElement("div");
    panelEl.className = "krytykai-panel";
    panelEl.innerHTML = `
      <div class="krytykai-header krytykai-header-fact">
        <span class="krytykai-title">🔍 ${escapeHtml(T.title)}</span>
        <button class="krytykai-close" title="${escapeHtml(T.close)}">×</button>
      </div>
      <div class="krytykai-body"></div>
    `;
    panelEl.querySelector(".krytykai-close").addEventListener("click", hidePanel);
    document.documentElement.appendChild(panelEl);
    return panelEl;
  }

  // Domyślne źródło treści dla bieżącej strony.
  function sourceMode() {
    return SITE.name === "generic" ? "page" : "chat";
  }

  function showPanel() {
    ensurePanel();
    panelEl.classList.add("krytykai-open");
  }
  function hidePanel() {
    if (panelEl) panelEl.classList.remove("krytykai-open");
    clearFlags();
  }

  function setBody(html) {
    ensurePanel();
    panelEl.querySelector(".krytykai-body").innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderLoading() {
    showPanel();
    setBody(`<div class="krytykai-loading">${escapeHtml(T.loading)}</div>`);
  }

  function renderError(msg) {
    showPanel();
    setBody(`<div class="krytykai-error">${escapeHtml(msg)}</div>`);
  }

  function renderAssessment(a) {
    if (!a || (!a.risk && !a.type)) return "";
    const r = String(a.risk || "").toLowerCase();
    let level = "med";
    let label = T.riskMed;
    // Akceptujemy kanoniczne EN (low/medium/high) i starsze PL warianty.
    if (r.includes("high") || r.includes("wys")) {
      level = "high";
      label = T.riskHigh;
    } else if (r.includes("low") || r.includes("nis")) {
      level = "low";
      label = T.riskLow;
    }
    const typeTxt = a.type ? ` · ${escapeHtml(typeLabel(a.type))}` : "";
    const note = a.note ? `<div class="krytykai-assess-note">${escapeHtml(a.note)}</div>` : "";
    return `
      <div class="krytykai-assess krytykai-assess-${level}">
        <div class="krytykai-assess-head">${escapeHtml(label)}${typeTxt}</div>
        ${note}
      </div>`;
  }

  // Linki weryfikacyjne budowane z tekstu pytania (gotowe adresy wyszukiwarek –
  // NIE generuje ich model, więc nie ma tu ryzyka halucynacji/zmyślonych źródeł).
  function verifyLinksHtml(qtext, kind) {
    const q = encodeURIComponent((qtext || "").slice(0, 300));
    if (!q) return "";
    const links = [[tr("searchGoogle"), `https://www.google.com/search?q=${q}`]];
    if (kind === "verify" || kind === "perspective") {
      links.push([
        "Google Fact Check",
        `https://toolbox.google.com/factcheck/explorer/search/${q}`,
      ]);
      if (activeLang === "pl") links.push(["Demagog", `https://demagog.org.pl/?s=${q}`]);
      else links.push(["Snopes", `https://www.snopes.com/?s=${q}`]);
    }
    return links
      .map(
        ([label, u]) =>
          `<a class="krytykai-btn" href="${u}" target="_blank" rel="noopener">${escapeHtml(
            label
          )}</a>`
      )
      .join("");
  }

  function renderResult(result, context, extraHtml) {
    showPanel();
    const badge =
      result.source === "heuristic"
        ? `<span class="krytykai-badge krytykai-badge-warn">offline</span>`
        : `<span class="krytykai-badge">${escapeHtml(result.source)}</span>`;

    const warn = result.warning
      ? `<div class="krytykai-warn">${escapeHtml(result.warning)}</div>`
      : "";

    const assessment = renderAssessment(result.assessment);

    const summary = result.summary
      ? `<div class="krytykai-summary">${escapeHtml(result.summary)}</div>`
      : "";

    // Kolejność: „druga strona" (perspective) zawsze na górze (balans), potem wg
    // ryzyka: niskie → ciekawostki (explore), średnie/wysokie → weryfikacja. Sort stabilny.
    const riskStr = String(result.assessment?.risk || "").toLowerCase();
    const isLowRisk = riskStr.includes("low") || riskStr.includes("nis");
    const order = isLowRisk
      ? { perspective: 0, explore: 1, verify: 2 }
      : { perspective: 0, verify: 1, explore: 2 };
    const rank = (k) => order[k] ?? 3;
    const ordered = (result.questions || [])
      .slice()
      .sort((a, b) => rank(a.kind) - rank(b.kind));

    const items = ordered
      .map((item) => {
        const q = escapeHtml(item.q || "");
        const why = item.why ? `<div class="krytykai-why">${escapeHtml(item.why)}</div>` : "";
        const kind = item.kind === "explore"
          ? `<span class="krytykai-kind krytykai-kind-info">${escapeHtml(T.kindExplore)}</span>`
          : item.kind === "verify"
          ? `<span class="krytykai-kind krytykai-kind-verify">${escapeHtml(T.kindVerify)}</span>`
          : item.kind === "perspective"
          ? `<span class="krytykai-kind krytykai-kind-persp">${escapeHtml(T.kindPerspective)}</span>`
          : "";
        return `
          <li class="krytykai-item">
            <div class="krytykai-q">${kind}${q}</div>
            ${why}
            <div class="krytykai-actions krytykai-actions-wrap">
              <button class="krytykai-btn" data-copy="${encodeURIComponent(item.q || "")}">${escapeHtml(T.copy)}</button>
              <button class="krytykai-btn krytykai-btn-primary" data-ask="${encodeURIComponent(item.q || "")}">${escapeHtml(T.ask)}</button>
              ${verifyLinksHtml(item.q, item.kind)}
            </div>
          </li>`;
      })
      .join("");

    setBody(`
      <div class="krytykai-meta">${badge}</div>
      ${assessment}
      ${warn}
      ${summary}
      <ul class="krytykai-list">${items || `<li>${escapeHtml(T.noQuestions)}</li>`}</ul>
      ${sourcesHtml(result.sources)}
      ${groundingBtnHtml(result)}
      ${extraHtml || ""}
    `);

    const gBtn = panelEl.querySelector("#krytykai-ground");
    if (gBtn)
      gBtn.addEventListener("click", () =>
        runAnalysis({ mode: lastSourceModeUsed, grounding: true })
      );

    panelEl.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = decodeURIComponent(btn.dataset.copy);
        navigator.clipboard.writeText(text).then(() => flash(btn, T.copied));
      });
    });
    panelEl.querySelectorAll("[data-ask]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = decodeURIComponent(btn.dataset.ask);
        askInGemini(text, context);
      });
    });
  }

  // Weryfikacja w realnych źródłach jest osobnym, świadomym krokiem: wyszukiwanie
  // Google ma u dostawcy dużo ciaśniejszy limit niż samo generowanie, więc nie
  // odpalamy go przy każdej analizie. Przycisk pokazujemy tylko wtedy, gdy jest
  // czym go obsłużyć (backend) i gdy tej weryfikacji jeszcze nie zrobiono.
  function groundingBtnHtml(result) {
    if (result.grounded || !backendConfigured) return "";
    return `
      <div class="krytykai-ground">
        <button class="krytykai-btn krytykai-btn-primary" id="krytykai-ground">${escapeHtml(
          tr("checkSources")
        )}</button>
        <div class="krytykai-ground-hint">${escapeHtml(tr("checkSourcesHint"))}</div>
      </div>`;
  }

  // Realne źródła z groundingu (backend). Linki pochodzą z wyszukiwarki, nie od modelu.
  function sourcesHtml(sources) {
    if (!Array.isArray(sources) || !sources.length) return "";
    const items = sources
      .slice(0, 6)
      .map(
        (s) =>
          `<li><a href="${encodeURI(s.url || "#")}" target="_blank" rel="noopener">${escapeHtml(
            s.title || s.url || ""
          )}</a></li>`
      )
      .join("");
    return `<div class="krytykai-sources"><div class="krytykai-sources-h">${escapeHtml(
      tr("sources")
    )}</div><ul>${items}</ul></div>`;
  }

  function flash(btn, label) {
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => (btn.textContent = old), 1200);
  }

  function askInGemini(question, context) {
    const prompt = buildGeminiPrompt(question, context);
    navigator.clipboard.writeText(prompt).catch(() => {});
    window.open("https://gemini.google.com/app", "_blank", "noopener");
  }

  function buildGeminiPrompt(question, context) {
    const src = context?.answerText || context?.userQuestion || "";
    const ctx = src ? `\n\nContext (content being verified):\n"""\n${src.slice(0, 2000)}\n"""` : "";
    return `Answer this verification question critically and with sources. Reply in the same language as the question:\n${question}${ctx}`;
  }

  // --- Przepływ analizy ------------------------------------------------------
  let lastContext = null;
  let lastSourceEl = null;
  // Zapamiętane, żeby „Sprawdź w źródłach" powtórzyło analizę tej samej treści.
  let lastSourceModeUsed = "page";

  async function runAnalysis({ mode, grounding = false }) {
    currentMode = "factcheck";
    lastSourceModeUsed = mode;
    setPanelHeader("factcheck");
    clearFlags();
    lastSourceEl = sourceElForMode(mode);
    let payload;
    if (mode === "chat") {
      payload = extractChat();
      if (!payload.answerText) {
        renderError(T.noAnswer);
        return;
      }
    } else if (mode === "selection") {
      const sel = extractSelection();
      if (!sel) {
        renderError(T.selectFirst);
        return;
      }
      payload = { userQuestion: "", answerText: sel };
    } else {
      payload = { userQuestion: "", answerText: extractArticle() };
    }

    lastContext = payload;
    renderLoading();

    try {
      const resp = await chrome.runtime.sendMessage({ type: "KRYTYKAI_ANALYZE", payload, grounding });
      if (!resp?.ok) {
        renderError(resp?.error || "Nieznany błąd analizy.");
        return;
      }
      renderResult(resp.result, payload);
      highlightFlags(lastSourceEl, resp.result?.flags);
    } catch (err) {
      const msg = String(err?.message || err);
      if (isContextInvalidated(msg)) {
        renderContextInvalidated();
      } else {
        renderError(msg);
      }
    }
  }

  // --- Podświetlanie spornych fragmentów (EKSPERYMENTALNE) ------------------
  function clearFlags() {
    document.querySelectorAll("mark.krytykai-flag").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  function highlightFlags(root, flags) {
    if (!root || !Array.isArray(flags)) return;
    for (const f of flags) {
      const quote = String(f?.quote || "").trim();
      // Zbyt krótkie cytaty pomijamy – ryzyko fałszywych trafień.
      if (quote.length < 10) continue;
      wrapFirstMatch(root, quote, String(f?.why || ""));
    }
  }

  function wrapFirstMatch(root, quote, why) {
    const needle = quote.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest("mark.krytykai-flag")) continue;
      const text = node.nodeValue || "";
      const idx = text.toLowerCase().indexOf(needle);
      if (idx === -1) continue;
      const before = text.slice(0, idx);
      const match = text.slice(idx, idx + quote.length);
      const after = text.slice(idx + quote.length);
      const mark = document.createElement("mark");
      mark.className = "krytykai-flag";
      mark.textContent = match;
      if (why) mark.title = why;
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(mark);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
      return true;
    }
    return false;
  }

  // --- Tryby uczące: My Story / Linglerno -----------------------------------
  function extractForSource() {
    if (sourceMode() === "chat") {
      const p = extractChat();
      if (!p.answerText) return { error: T.noAnswer };
      return { payload: p };
    }
    const article = extractArticle();
    if (!article) return { error: T.selectFirst };
    return { payload: { userQuestion: "", answerText: article } };
  }

  async function runLearn(mode) {
    const { payload, error } = extractForSource();
    if (error) {
      renderError(error);
      return;
    }
    lastContext = payload;
    renderLoading();
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "KRYTYKAI_ANALYZE_LEARN",
        mode,
        payload,
      });
      if (!resp?.ok) {
        renderError(resp?.error || "Błąd analizy.");
        return;
      }
      const r = resp.result;
      if (r?.needCloud) {
        renderNeedCloud(r.warning);
        return;
      }
      if (mode === "lingo") renderLingo(r);
      else renderStory(r);
      // Lekcja zapisuje się sama – użytkownik nie musi nic klikać, a postęp
      // (XP, seria, słówka do powtórek) rośnie w tle.
      saveLessonLocally(mode, r);
    } catch (err) {
      const msg = String(err?.message || err);
      if (isContextInvalidated(msg)) renderContextInvalidated();
      else renderError(msg);
    }
  }

  function renderNeedCloud(warning) {
    showPanel();
    setBody(`
      <div class="krytykai-warn">${escapeHtml(warning || "")}</div>
      <div class="krytykai-actions" style="margin-top:10px;">
        <button class="krytykai-btn krytykai-btn-primary" id="krytykai-opts">${escapeHtml(tr("openOptions"))}</button>
      </div>
    `);
    const btn = panelEl.querySelector("#krytykai-opts");
    if (btn)
      btn.addEventListener("click", () =>
        chrome.runtime.sendMessage({ type: "KRYTYKAI_OPEN_OPTIONS" }).catch(() => {})
      );
  }

  function listBlock(title, items) {
    if (!items || !items.length) return "";
    const li = items.map((x) => `<li>${x}</li>`).join("");
    return `<div class="krytykai-learn-sec"><div class="krytykai-learn-h">${escapeHtml(
      title
    )}</div><ul class="krytykai-learn-list">${li}</ul></div>`;
  }

  // Zamienia markdownowe **pogrubienie** modelu na <strong> (po zabezpieczeniu HTML),
  // żeby nie pokazywały się surowe gwiazdki.
  function mdBold(text) {
    return escapeHtml(String(text || "")).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  // Zamienia znaczniki [[słowo]] na podświetlenie (streszczenie w języku nauki)
  // lub pogrubienie (odpowiedniki w tłumaczeniu użytkownika).
  function markHighlights(text, mode) {
    const wrap =
      mode === "bold"
        ? (s) => `<strong>${s}</strong>`
        : (s) => `<mark class="krytykai-hl">${s}</mark>`;
    return escapeHtml(String(text || "")).replace(/\[\[([^\]]+)\]\]/g, (_m, g) => wrap(g));
  }

  function renderStory(r) {
    showPanel();
    const badge = `<span class="krytykai-badge">${escapeHtml(r.source || "gemini")}</span>`;
    const takeaways = listBlock(
      tr("takeaways"),
      (r.takeaways || []).map((t) => mdBold(t))
    );
    const read = readNextBlock(r.read_next || []);
    const lesson = r.lesson
      ? `<div class="krytykai-learn-sec"><div class="krytykai-learn-h">${escapeHtml(
          tr("lesson")
        )}</div><div class="krytykai-summary">${mdBold(r.lesson)}</div></div>`
      : "";
    setBody(`<div class="krytykai-meta">${badge}</div>${takeaways}${read}${lesson}`);
  }

  // „Co dalej" jako linki do wyszukiwarki/kursu (zapytania z modelu → gotowe URL-e,
  // więc bez zmyślonych źródeł/adresów).
  function readNextBlock(items) {
    const list = (items || []).slice(0, 2);
    if (!list.length) return "";
    const li = list
      .map((x) => {
        const query = x.query || x.title || "";
        const q = encodeURIComponent(String(query).slice(0, 200));
        const why = x.why ? ` – ${mdBold(x.why)}` : "";
        const g = `https://www.google.com/search?q=${q}`;
        const yt = `https://www.youtube.com/results?search_query=${q}`;
        return `<li><b>${mdBold(query)}</b>${why}
          <div class="krytykai-actions krytykai-actions-wrap" style="margin-top:4px;">
            <a class="krytykai-btn" href="${g}" target="_blank" rel="noopener">${escapeHtml(tr("searchGoogle"))}</a>
            <a class="krytykai-btn" href="${yt}" target="_blank" rel="noopener">${escapeHtml(tr("course"))}</a>
          </div></li>`;
      })
      .join("");
    return `<div class="krytykai-learn-sec"><div class="krytykai-learn-h">${escapeHtml(
      tr("readNext")
    )}</div><ul class="krytykai-learn-list">${li}</ul></div>`;
  }

  function renderLingo(r) {
    showPanel();
    const badge = `<span class="krytykai-badge">${escapeHtml(r.source || "gemini")}</span>`;
    const summary =
      r.summary_target || r.summary_native
        ? `<div class="krytykai-learn-sec"><div class="krytykai-learn-h">${escapeHtml(
            tr("summaryTarget")
          )}</div><div class="krytykai-summary">${markHighlights(r.summary_target || "", "hl")}</div>${
            r.summary_native
              ? `<div class="krytykai-learn-native">${markHighlights(r.summary_native, "bold")}</div>`
              : ""
          }</div>`
        : "";
    const vocab = listBlock(
      tr("vocab"),
      (r.vocab || []).map((v) => {
        const ex = v.example ? `<div class="krytykai-why">${escapeHtml(v.example)}</div>` : "";
        return `<b>${escapeHtml(v.term || "")}</b> — ${escapeHtml(v.translation || "")}${ex}`;
      })
    );
    const phrases = listBlock(
      tr("phrases"),
      (r.phrases || []).map(
        (p) => `<b>${escapeHtml(p.phrase || "")}</b> — ${escapeHtml(p.translation || "")}`
      )
    );
    const culture = r.culture
      ? `<div class="krytykai-learn-sec"><div class="krytykai-learn-h">${escapeHtml(
          tr("culture")
        )}</div><div class="krytykai-summary">${escapeHtml(r.culture)}</div></div>`
      : "";
    setBody(`<div class="krytykai-meta">${badge}</div>${summary}${vocab}${phrases}${culture}`);
  }

  // --- Zapis lekcji do lokalnej biblioteki ---------------------------------
  // Profil z ustawień – potrzebny do oznaczenia lekcji językiem i poziomem.
  let userProfile = {};
  // Bez backendu nie ma czym zrobić weryfikacji w źródłach – chowamy przycisk.
  let backendConfigured = false;

  async function saveLessonLocally(mode, result) {
    const store = globalThis.KRYTYKAI_STORE;
    if (!store) return; // brak magazynu (np. stara wersja w karcie) – pomiń cicho
    try {
      // Zawód potrzebny tylko trybowi kariery – to on odwzorowuje identyfikatory
      // zwrócone przez model na konkretne umiejętności z klasyfikacji.
      const occupation =
        mode === "lingo"
          ? null
          : (await chrome.storage.local.get("krytykai_occupation")).krytykai_occupation || null;

      const res = await store.saveLesson({
        mode: mode === "lingo" ? "lingo" : "career",
        sourceUrl: location.href,
        sourceTitle: document.title,
        result,
        profile: userProfile,
        occupation,
      });
      renderSaveStrip(res);
    } catch (err) {
      console.warn("[KrytykAI] Nie udało się zapisać lekcji:", err);
    }
  }

  // Pasek pod lekcją: co przybyło i skrót do biblioteki.
  function renderSaveStrip(res) {
    if (!panelEl) return;
    const body = panelEl.querySelector(".krytykai-body");
    if (!body) return;

    const bits = [`+${res.xpEarned} XP`];
    if (res.savedVocab) bits.push(`${res.savedVocab} ${tr("wordsSaved")}`);
    if (res.streakBonus) bits.push(`🔥 ${res.streak}`);

    const badges = res.newBadges
      .map((b) => `<span class="krytykai-newbadge">${b.icon} ${escapeHtml(b.name)}</span>`)
      .join("");

    const due = res.dueCount
      ? `<div class="krytykai-save-due">${escapeHtml(tr("dueNow"))}: ${res.dueCount}</div>`
      : "";

    const strip = document.createElement("div");
    strip.className = "krytykai-save";
    strip.innerHTML = `
      <div class="krytykai-save-row">
        <span class="krytykai-save-gain">${escapeHtml(bits.join(" · "))}</span>
        <button class="krytykai-btn krytykai-btn-primary" id="krytykai-lib">${escapeHtml(tr("library"))}</button>
      </div>
      ${badges ? `<div class="krytykai-save-badges">${badges}</div>` : ""}
      ${due}`;
    body.appendChild(strip);

    strip.querySelector("#krytykai-lib").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "KRYTYKAI_OPEN_LIBRARY" }).catch(() => {});
    });
  }

  // --- Analiza mediów (obraz / wideo z menu kontekstowego) ------------------
  async function runMediaAnalysis({ srcUrl, mediaType }) {
    const context = collectPageContext();
    let dataUrl = null;
    if (mediaType === "video") dataUrl = captureVideoFrame(srcUrl);
    lastContext = { userQuestion: "", answerText: context };
    renderLoading();
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "KRYTYKAI_ANALYZE_MEDIA",
        payload: { srcUrl, mediaType, dataUrl, context },
      });
      if (!resp?.ok) {
        renderError(resp?.error || "Błąd analizy mediów.");
        return;
      }
      renderResult(resp.result, lastContext, mediaLinksHtml(srcUrl, mediaType));
    } catch (err) {
      const msg = String(err?.message || err);
      if (isContextInvalidated(msg)) renderContextInvalidated();
      else renderError(msg);
    }
  }

  function collectPageContext() {
    const parts = [document.title];
    const md = document.querySelector(
      'meta[name="description"], meta[property="og:description"]'
    );
    if (md?.content) parts.push(md.content);
    const sel = extractSelection();
    if (sel) parts.push(sel);
    return parts.filter(Boolean).join("\n").slice(0, 1500);
  }

  function captureVideoFrame(srcUrl) {
    try {
      const vids = Array.from(document.querySelectorAll("video"));
      const v =
        vids.find((x) => x.currentSrc === srcUrl || x.src === srcUrl) ||
        vids.find((x) => !x.paused && x.videoWidth) ||
        vids.find((x) => x.videoWidth) ||
        vids[0];
      if (!v || !v.videoWidth) return null;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(v.videoWidth, 1280);
      canvas.height = Math.round((canvas.width / v.videoWidth) * v.videoHeight);
      canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return null; // np. wideo z innej domeny (canvas „tainted")
    }
  }

  function mediaLinksHtml(srcUrl, mediaType) {
    const label = T.reverseSearch || I18N.en.reverseSearch;
    const links = [];
    const enc = encodeURIComponent(srcUrl || "");
    if (srcUrl && /^https?:/i.test(srcUrl)) {
      links.push(["Google Lens", `https://lens.google.com/uploadbyurl?url=${enc}`]);
      links.push(["Google Images", `https://www.google.com/searchbyimage?image_url=${enc}`]);
      links.push(["TinEye", `https://tineye.com/search?url=${enc}`]);
    }
    if (mediaType === "video") {
      links.push(["InVID / WeVerify", "https://weverify.eu/verification-plugin/"]);
    }
    if (!links.length) return "";
    const a = links
      .map(
        ([t, u]) =>
          `<a class="krytykai-btn" href="${u}" target="_blank" rel="noopener">${escapeHtml(t)}</a>`
      )
      .join("");
    return `<div class="krytykai-mediatools"><div class="krytykai-mediatools-label">${escapeHtml(
      label
    )}</div><div class="krytykai-actions krytykai-actions-wrap">${a}</div></div>`;
  }

  function isContextInvalidated(msg) {
    return /context invalidated|Extension context|message port closed|receiving end does not exist/i.test(msg);
  }

  function renderContextInvalidated() {
    showPanel();
    setBody(`
      <div class="krytykai-error">${escapeHtml(T.ctx)}</div>
      <div class="krytykai-actions" style="margin-top:10px;">
        <button class="krytykai-btn krytykai-btn-primary" id="krytykai-reload">${escapeHtml(T.reload)}</button>
      </div>
    `);
    const btn = panelEl.querySelector("#krytykai-reload");
    if (btn) btn.addEventListener("click", () => location.reload());
  }

  // --- Auto-analiza czatu (opcjonalna) --------------------------------------
  let autoTimer = null;
  let lastAnswerSnapshot = "";

  function watchChatForAuto() {
    if (SITE.name === "generic" || !SITE.cfg) return;
    const observer = new MutationObserver(() => {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        const { answerText } = extractChat();
        if (answerText && answerText !== lastAnswerSnapshot && answerText.length > 40) {
          lastAnswerSnapshot = answerText;
          runAnalysis({ mode: "chat" });
        }
      }, 2500); // odczekaj aż streaming odpowiedzi się ustabilizuje
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  // --- Wiadomości z tła (menu kontekstowe) ----------------------------------
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "KRYTYKAI_TRIGGER") {
      if (msg.kind === "selection") runAnalysis({ mode: "selection" });
      else runAnalysis({ mode: "page" });
    } else if (msg?.type === "KRYTYKAI_TRIGGER_MEDIA") {
      runMediaAnalysis({ srcUrl: msg.srcUrl, mediaType: msg.mediaType });
    }
  });

  // --- Inicjalizacja ---------------------------------------------------------
  chrome.storage.sync.get(STORAGE_KEY, (data) => {
    const s = { ...DEFAULTS, ...(data[STORAGE_KEY] || {}) };
    if (!s.enabled) return;
    if (s.language) setActiveLang(s.language);
    userProfile = s.profile || {};
    backendConfigured = !!(s.backendUrl || "").trim();
    ensureLauncher();
    if (s.autoAnalyzeChat) watchChatForAuto();
    // Rozgrzej model lokalny w tle, by pierwsza analiza była szybsza.
    if (SITE.name !== "generic") {
      chrome.runtime.sendMessage({ type: "KRYTYKAI_WARMUP" }).catch(() => {});
    }
  });
})();
