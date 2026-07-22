// Klient ESCO – europejskiej klasyfikacji zawodów i umiejętności.
//
// Dlaczego akurat ESCO: API jest publiczne (bez klucza i rejestracji), dane są
// wielojęzyczne (w tym po polsku), a licencja (decyzja Komisji 2011/833/EU)
// pozwala na dowolne użycie, także komercyjne, pod warunkiem podania źródła.
//
// Zawód pobieramy RAZ przy wyborze i trzymamy lokalnie – dalsza praca (mapowanie
// lekcji na umiejętności, liczenie pokrycia) dzieje się bez sieci.
//
// UWAGA: to NIE jest moduł ES – patrz komentarz w catalog.js.

(() => {
  "use strict";

  const API = "https://ec.europa.eu/esco/api";
  const OCCUPATION_KEY = "krytykai_occupation";

  // Wyszukiwarka ESCO dopasowuje leksykalnie, nie znaczeniowo: zapytanie
  // „uczenie maszynowe" zwraca też „obsługiwać wentylatory maszynowe". Dla
  // ZAWODÓW to akceptowalne (użytkownik wybiera z listy wzrokowo), ale dlatego
  // NIE używamy jej do automatycznego mapowania treści na umiejętności.
  async function searchOccupations(text, language = "pl", limit = 12) {
    const q = String(text || "").trim();
    if (q.length < 2) return [];
    const url = `${API}/search?text=${encodeURIComponent(q)}&language=${encodeURIComponent(
      language
    )}&type=occupation&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ESCO search ${res.status}`);
    const data = await res.json();
    return (data?._embedded?.results || []).map((r) => ({
      uri: r.uri,
      title: r.title || r.preferredLabel?.[language] || r.uri,
    }));
  }

  /** Umiejętności kluczowe i opcjonalne dla zawodu (ok. 20-40 pozycji). */
  async function fetchOccupation(uri, language = "pl") {
    const url = `${API}/resource/occupation?uri=${encodeURIComponent(
      uri
    )}&language=${encodeURIComponent(language)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ESCO occupation ${res.status}`);
    const d = await res.json();

    const pick = (rel) =>
      (d?._links?.[rel] || []).map((s) => ({ uri: s.uri, title: s.title })).filter((s) => s.uri && s.title);

    return {
      uri,
      language,
      title: d?.preferredLabel?.[language] || d?.title || uri,
      description: d?.description?.[language]?.literal || "",
      essential: pick("hasEssentialSkill"),
      optional: pick("hasOptionalSkill"),
      fetched_at: new Date().toISOString(),
    };
  }

  // --- Zapis lokalny --------------------------------------------------------

  async function getSavedOccupation() {
    const d = await chrome.storage.local.get(OCCUPATION_KEY);
    return d[OCCUPATION_KEY] || null;
  }

  /**
   * Pobiera zawód z ESCO i zapisuje lokalnie – od tej pory działa offline.
   * Lista `options` liczona jest tutaj raz, żeby service worker mógł ją tylko
   * odczytać, bez powielania logiki numerowania.
   */
  async function selectOccupation(uri, language = "pl") {
    const occ = await fetchOccupation(uri, language);
    occ.options = skillOptions(occ);
    await chrome.storage.local.set({ [OCCUPATION_KEY]: occ });
    return occ;
  }

  async function clearOccupation() {
    await chrome.storage.local.remove(OCCUPATION_KEY);
  }

  /** Wszystkie umiejętności zawodu jako jedna lista z oznaczeniem wagi. */
  function allSkills(occ) {
    if (!occ) return [];
    return [
      ...occ.essential.map((s) => ({ ...s, essential: true })),
      ...occ.optional.map((s) => ({ ...s, essential: false })),
    ];
  }

  /**
   * Krótkie identyfikatory dla modelu. Pełne URI ESCO są długie i łatwo je
   * przekręcić, więc do promptu idą numery, które potem odwzorowujemy z powrotem.
   */
  function skillOptions(occ) {
    return allSkills(occ).map((s, i) => ({ id: `s${i + 1}`, uri: s.uri, title: s.title, essential: s.essential }));
  }

  /** Odwzorowanie odpowiedzi modelu (["s3","s7"]) na konkretne umiejętności. */
  function resolveSkillIds(occ, ids) {
    if (!occ || !Array.isArray(ids)) return [];
    const byId = new Map((occ.options || skillOptions(occ)).map((o) => [o.id, o]));
    const out = [];
    const seen = new Set();
    for (const raw of ids) {
      const key = String(raw || "").trim().toLowerCase();
      const hit = byId.get(key);
      if (hit && !seen.has(hit.uri)) {
        seen.add(hit.uri);
        out.push(hit);
      }
    }
    return out.slice(0, 3);
  }

  globalThis.KRYTYKAI_ESCO = {
    OCCUPATION_KEY,
    searchOccupations,
    fetchOccupation,
    getSavedOccupation,
    selectOccupation,
    clearOccupation,
    allSkills,
    skillOptions,
    resolveSkillIds,
  };
})();
