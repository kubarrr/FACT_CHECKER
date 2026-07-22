// Zbieranie i wstępna ocena komentarzy ze strony.
//
// Zasady, które wynikły z ograniczeń serwisów i z tego, jak ma działać produkt:
//
// 1. Listy komentarzy są WIRTUALIZOWANE (YouTube, X, Reddit) – w DOM istnieje
//    tylko to, co widać. Nie udajemy więc, że analizujemy „wszystkie komentarze";
//    pracujemy na tym, co użytkownik ma aktualnie na ekranie.
// 2. Najpierw sito lokalne, potem model. Sito jest darmowe i odsiewa oczywisty
//    szum, więc do modelu trafia kilkadziesiąt pozycji zamiast kilkuset.
// 3. Celem jest WYDOBYĆ wartościowe, nie piętnować autorów. Dlatego nie ma tu
//    nigdzie etykiety „hejter" ani liczenia czegokolwiek per osoba między
//    stronami – jedynie ocena pojedynczej wypowiedzi w jednym wątku.
//
// UWAGA: to NIE jest moduł ES – patrz komentarz w catalog.js.

(() => {
  "use strict";

  // Adaptery na serwis: selektor pojedynczego komentarza + autora + treści.
  // Kolejność ma znaczenie tylko tyle, że pierwszy pasujący host wygrywa.
  const ADAPTERS = [
    {
      name: "youtube",
      match: /(^|\.)youtube\.com$/,
      item: "ytd-comment-thread-renderer, ytd-comment-view-model",
      author: "#author-text, #header-author a",
      text: "#content-text",
    },
    {
      name: "reddit",
      match: /(^|\.)reddit\.com$/,
      item: "shreddit-comment, div[data-testid='comment']",
      author: "[slot='commentAvatar'] + * a, a[href^='/user/']",
      text: "[slot='comment'], [data-testid='comment-top-meta'] + div",
    },
    {
      name: "hn",
      match: /(^|\.)news\.ycombinator\.com$/,
      item: "tr.athing.comtr",
      author: ".hnuser",
      text: ".commtext",
    },
    {
      name: "x",
      match: /(^|\.)(twitter|x)\.com$/,
      item: 'article[data-testid="tweet"]',
      author: '[data-testid="User-Name"]',
      text: '[data-testid="tweetText"]',
    },
  ];

  // Fallback dla reszty internetu: typowe kontenery sekcji komentarzy.
  // Świadomie zachowawczy – lepiej nie pokazać przycisku, niż zaznaczyć
  // akapity artykułu jako „komentarze".
  const GENERIC_ITEMS = [
    "[class*='comment']:not([class*='comments']):not([class*='comment-form'])",
    "li[id^='comment-']",
    "article[class*='post']",
  ];

  const MIN_COMMENTS = 4; // poniżej tego nie ma czego sortować

  function adapterForHost() {
    const host = location.hostname;
    return ADAPTERS.find((a) => a.match.test(host)) || null;
  }

  function textOf(el) {
    return (el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  // --- Zbieranie ------------------------------------------------------------

  /**
   * Zwraca widoczne komentarze. Elementy DOM zostają w pamięci (do
   * podświetlania), a na zewnątrz idzie tylko tekst.
   */
  function collect({ limit = 120 } = {}) {
    const ad = adapterForHost();
    const out = [];
    const seen = new Set();

    const push = (node, author, text) => {
      const t = text.slice(0, 1200);
      const key = `${author}|${t.slice(0, 120)}`;
      if (t.length < 3 || seen.has(key)) return;
      seen.add(key);
      out.push({ id: `c${out.length}`, el: node, author: author.slice(0, 60), text: t });
    };

    if (ad) {
      for (const node of document.querySelectorAll(ad.item)) {
        if (out.length >= limit) break;
        const body = node.querySelector(ad.text);
        const t = textOf(body || node);
        if (!t) continue;
        push(node, textOf(node.querySelector(ad.author)) || "—", t);
      }
      return { site: ad.name, items: out };
    }

    for (const sel of GENERIC_ITEMS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch {
        continue; // selektor odrzucony przez przeglądarkę – pomijamy
      }
      if (nodes.length < MIN_COMMENTS) continue;
      for (const node of nodes) {
        if (out.length >= limit) break;
        const t = textOf(node);
        // Odsiewamy bloki zbyt długie jak na komentarz (to zwykle treść strony).
        if (t.length < 15 || t.length > 4000) continue;
        push(node, "—", t);
      }
      if (out.length >= MIN_COMMENTS) break;
      out.length = 0;
      seen.clear();
    }
    return { site: "generic", items: out };
  }

  /** Czy w ogóle warto pokazywać przycisk na tej stronie. */
  function hasComments() {
    return collect({ limit: MIN_COMMENTS + 1 }).items.length >= MIN_COMMENTS;
  }

  // --- Sito lokalne ---------------------------------------------------------

  // Krótka lista wyzwisk kierowanych w osobę (PL + EN). Nie służy do etykietowania
  // ludzi, tylko do odsiania wypowiedzi bez treści, zanim zapłacimy za model.
  const SLURS =
    /\b(idiot\w*|kretyn\w*|debil\w*|mor(on|ony)\w*|glup\w*|głup\w*|zjeb\w*|jeb\w*|kurw\w*|chuj\w*|dziad\w*|stupid|shut ?up|trash|garbage|clown\w*)\b/i;

  const SUBSTANCE =
    /\b(ponieważ|dlatego|według|źródł\w+|badani\w+|dane|statystyk\w+|natomiast|jednak|przykład\w*|because|however|source|study|studies|data|evidence|research|actually|for example)\b/i;

  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

  /**
   * Ocena bez modelu. Zwraca „noise" (odsiewamy), „keep" (do modelu) i
   * wstępny wynik. Świadomie łagodna: przy wątpliwości przepuszczamy dalej.
   */
  function prescore(text) {
    const t = String(text || "").trim();
    const letters = t.replace(/[^\p{L}]/gu, "").length;
    const upper = t.replace(/[^\p{Lu}]/gu, "").length;
    const emoji = (t.match(EMOJI) || []).length;
    const words = t.split(/\s+/).filter(Boolean).length;

    let score = 0;
    const flags = [];

    if (t.length < 25) { score -= 2; flags.push("short"); }
    if (letters === 0) { score -= 3; flags.push("no-letters"); }
    if (emoji > 0 && letters < 10) { score -= 3; flags.push("emoji-only"); }
    if (letters > 12 && upper / letters > 0.6) { score -= 2; flags.push("shouting"); }
    if (/(.)\1{4,}/.test(t)) { score -= 1; flags.push("repeat"); }
    if (SLURS.test(t)) { score -= 2; flags.push("slur"); }

    if (t.length > 120) score += 1;
    if (t.length > 300) score += 1;
    if (words > 25) score += 1;
    if (SUBSTANCE.test(t)) { score += 2; flags.push("reasoning"); }
    if (/\d/.test(t)) score += 1;
    if (/https?:\/\//.test(t)) { score += 1; flags.push("link"); }
    if (/\?/.test(t) && words > 6) score += 1;

    // Odsiewamy tylko to, co jest jednoznacznie puste treściowo.
    const noise = score <= -3 || (letters < 8 && t.length < 20);
    return { score, flags, noise };
  }

  /**
   * Przygotowuje wsad dla modelu: odsiewa oczywisty szum, resztę sortuje wg
   * wstępnego wyniku i przycina do budżetu jednego wywołania.
   */
  function prepareBatch(items, { budget = 40 } = {}) {
    const scored = items.map((c) => ({ ...c, ...prescore(c.text) }));
    const kept = scored.filter((c) => !c.noise);
    const dropped = scored.filter((c) => c.noise);
    const batch = kept.slice().sort((a, b) => b.score - a.score).slice(0, budget);
    return { scored, kept, dropped, batch };
  }

  globalThis.KRYTYKAI_COMMENTS = {
    MIN_COMMENTS,
    collect,
    hasComments,
    prescore,
    prepareBatch,
    adapterForHost,
  };
})();
