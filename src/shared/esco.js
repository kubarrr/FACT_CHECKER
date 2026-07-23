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

  // --- Persony (wirtualne profile kariery) ----------------------------------
  // Kariera rozbija się na kilka person: każda to inny zawód + własne pola
  // (rola, branża, cele). Jedna jest aktywna i steruje pokryciem oraz
  // mapowaniem lekcji. Język jest globalny (w ustawieniach), niezależny od person.
  //
  // OCCUPATION_KEY jest MOSTEM wstecznym: trzymamy w nim zawód aktywnej persony,
  // żeby content script i service worker czytały jak dawniej, bez zmian.

  const PERSONAS_KEY = "krytykai_personas";
  const ACTIVE_KEY = "krytykai_active_persona";
  const MAX_PERSONAS = 4;

  function uid() {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function readPersonas() {
    const d = await chrome.storage.local.get([PERSONAS_KEY, ACTIVE_KEY]);
    return { personas: d[PERSONAS_KEY] || [], activeId: d[ACTIVE_KEY] || null };
  }

  async function getPersonas() {
    return (await readPersonas()).personas;
  }

  async function getActivePersona() {
    const { personas, activeId } = await readPersonas();
    return personas.find((p) => p.id === activeId) || personas[0] || null;
  }

  // Zawód aktywnej persony trafia do mostu wstecznego – jeden punkt prawdy.
  async function syncActiveOccupation() {
    const active = await getActivePersona();
    if (active?.occupation) {
      await chrome.storage.local.set({ [OCCUPATION_KEY]: active.occupation });
    } else {
      await chrome.storage.local.remove(OCCUPATION_KEY);
    }
    return active;
  }

  async function savePersonas(personas, activeId) {
    await chrome.storage.local.set({ [PERSONAS_KEY]: personas, [ACTIVE_KEY]: activeId });
    await syncActiveOccupation();
  }

  async function addPersona({ label = "", role = "", industry = "", goals = "", real } = {}) {
    const { personas } = await readPersonas();
    if (personas.length >= MAX_PERSONAS) throw new Error(`max ${MAX_PERSONAS} person`);
    // Pierwszy profil jest „prawdziwy" (Twój), kolejne domyślnie wirtualne.
    const isReal = real != null ? real : personas.length === 0;
    const persona = {
      id: uid(), label, role, industry, goals, occupation: null,
      real: isReal, created_at: new Date().toISOString(),
    };
    const next = [...personas, persona];
    await savePersonas(next, persona.id); // nowa persona staje się aktywna
    return persona;
  }

  async function updatePersona(id, patch) {
    const { personas, activeId } = await readPersonas();
    const next = personas.map((p) => (p.id === id ? { ...p, ...patch } : p));
    await savePersonas(next, activeId);
    return next.find((p) => p.id === id) || null;
  }

  async function setActivePersona(id) {
    const { personas } = await readPersonas();
    if (!personas.some((p) => p.id === id)) return;
    await savePersonas(personas, id);
  }

  async function removePersona(id) {
    const { personas, activeId } = await readPersonas();
    const next = personas.filter((p) => p.id !== id);
    const nextActive = activeId === id ? next[0]?.id || null : activeId;
    await savePersonas(next, nextActive);
  }

  /** Ustawia zawód persony (pobiera z ESCO). Jeśli aktywna – odświeża most. */
  async function setPersonaOccupation(id, uri, language = "pl") {
    const occ = await fetchOccupation(uri, language);
    occ.options = skillOptions(occ);
    return updatePersona(id, { occupation: occ });
  }

  async function clearPersonaOccupation(id) {
    return updatePersona(id, { occupation: null });
  }

  /**
   * Jednorazowa migracja: stary pojedynczy zawód + karierowe pola profilu
   * stają się pierwszą personą. Bezpieczna do wielokrotnego wywołania.
   */
  async function ensureMigrated(profile) {
    const { personas } = await readPersonas();
    if (personas.length) return; // już zmigrowane
    const d = await chrome.storage.local.get(OCCUPATION_KEY);
    const occ = d[OCCUPATION_KEY] || null;
    const p = profile || {};
    const hasCareer = occ || p.role || p.industry || p.goals;
    if (!hasCareer) return; // nie ma czego migrować
    const persona = {
      id: uid(),
      label: occ?.title || p.role || "Kariera",
      role: p.role || "",
      industry: p.industry || "",
      goals: p.goals || "",
      skills: p.skills || "",
      interests: p.interests || "",
      occupation: occ,
      real: true, // profil zbudowany z Twoich prawdziwych danych
      created_at: new Date().toISOString(),
    };
    await savePersonas([persona], persona.id);
  }

  // --- Zapis lokalny (most wsteczny) ----------------------------------------

  // Zawód aktywnej persony – tak czytają go content script i service worker.
  async function getSavedOccupation() {
    const active = await getActivePersona();
    if (active) return active.occupation || null;
    // Brak person (np. przed migracją) – stary pojedynczy zawód.
    const d = await chrome.storage.local.get(OCCUPATION_KEY);
    return d[OCCUPATION_KEY] || null;
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
    MAX_PERSONAS,
    searchOccupations,
    fetchOccupation,
    getSavedOccupation,
    allSkills,
    skillOptions,
    resolveSkillIds,
    // persony
    getPersonas,
    getActivePersona,
    addPersona,
    updatePersona,
    setActivePersona,
    removePersona,
    setPersonaOccupation,
    clearPersonaOccupation,
    ensureMigrated,
  };
})();
