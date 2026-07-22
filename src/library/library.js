// Biblioteka: powtórki (SRS), słownik, mapa umiejętności i historia.
// Czyta wyłącznie lokalny magazyn (KRYTYKAI_STORE) – żadnego backendu.

(() => {
  "use strict";

  const C = globalThis.KRYTYKAI_CATALOG;
  const S = globalThis.KRYTYKAI_STORE;
  const E = globalThis.KRYTYKAI_ESCO;
  const SETTINGS_KEY = "krytykai_settings";

  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let settings = {};
  let activeTab = "review";
  // Filtry – domyślnie zawężone do języka z profilu, żeby po zmianie języka
  // nauki nie mieszać w powtórkach fiszek z poprzedniego. `null` = wszystkie.
  let vocabLang;
  let reviewLang;
  let vocabSort = "recent";

  function currentLang() {
    const p = settings.profile || {};
    return p.targetLangCode || C.codeFromLegacyName(p.targetLang) || null;
  }

  // Przełącznik języków – wspólny dla powtórek i słownika.
  function langChipsHtml(active, langs) {
    const chips = langs
      .map((code) => {
        const l = C.findLanguage(code);
        return `<button class="chip" data-lang="${esc(code)}" aria-pressed="${active === code}">${
          l ? l.flag + " " + esc(l.name) : esc(code)
        }</button>`;
      })
      .join("");
    return `<button class="chip" data-lang="" aria-pressed="${active === null}">Wszystkie</button>${chips}`;
  }

  // --- Formatowanie ---------------------------------------------------------
  const dtf = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  const tf = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" });

  function dayLabel(key) {
    const today = S.dayKey(new Date());
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (key === today) return "Dzisiaj";
    if (key === S.dayKey(y)) return "Wczoraj";
    return dtf.format(new Date(`${key}T12:00:00`));
  }

  function relFuture(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "teraz";
    const h = Math.round(ms / 3600000);
    if (h < 24) return `za ${Math.max(1, h)} godz.`;
    return `za ${Math.round(h / 24)} dni`;
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function toast(text) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = text;
    $("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // Umiejętności lekcji to obiekty {uri, title, essential} – gwiazdka oznacza
  // umiejętność kluczową dla zawodu.
  function skillTagsHtml(skills) {
    if (!skills?.length) return "";
    const tags = skills
      .map((s) => `<span class="tag">${s.essential ? "★ " : ""}${esc(s.title)}</span>`)
      .join("");
    return `<div class="lesson-tags">${tags}</div>`;
  }

  function emptyState(emoji, title, body) {
    return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
  }

  // --- Nagłówek -------------------------------------------------------------
  async function renderHeader() {
    // Liczniki idą za aktywnym filtrem powtórek, żeby „do powtórki" zgadzało
    // się z tym, co użytkownik faktycznie dostanie w sesji.
    const st = await S.getDashboardStats({ language: reviewLang });
    const code = settings.profile?.targetLangCode || "";
    const lang = C.findLanguage(code);
    C.applyTheme(document.documentElement, code || "en");

    const lvl = C.getUserAppLevel(st.xp);
    $("heroFlag").textContent = lang ? lang.flag : "📚";
    $("heroLevel").textContent = lvl.name;
    $("heroSub").textContent = lang
      ? `${lang.name} · poziom ${settings.profile?.level || "A2"}`
      : "Ustaw język nauki w ustawieniach";
    $("heroStreak").textContent = `🔥 ${st.streak}`;
    $("heroStreak").title = st.streak === 1 ? "1 dzień z rzędu" : `${st.streak} dni z rzędu`;
    $("xpFill").style.width = `${lvl.progress}%`;
    $("xpNow").textContent = `${st.xp} XP`;
    $("xpNext").textContent = lvl.next > st.xp ? `${lvl.next - st.xp} XP do następnego poziomu` : "poziom maksymalny";

    $("stats").innerHTML = [
      { n: st.due_count, l: "do powtórki", due: true },
      { n: st.vocab_count, l: "słówek w albumie" },
      { n: st.mastered_count, l: "opanowanych" },
      { n: st.lessons_count, l: "lekcji łącznie" },
    ]
      .map((s) => `<div class="stat${s.due ? " is-due" : ""}"><div class="stat-n">${s.n}</div><div class="stat-l">${esc(s.l)}</div></div>`)
      .join("");

    $("badges").innerHTML = C.BADGES.map((b) => {
      const got = st.badges.includes(b.id);
      return `<span class="badge${got ? "" : " locked"}" title="${esc(b.description)}"><em>${b.icon}</em>${esc(b.name)}</span>`;
    }).join("");

    const pill = $("duePill");
    pill.textContent = st.due_count;
    pill.hidden = st.due_count === 0;
  }

  // --- Zakładka: powtórki ---------------------------------------------------
  let queue = [];
  let sessionDone = 0;
  let flipped = false;

  async function renderReview() {
    const el = $("panel-review");
    if (!queue.length) {
      queue = await S.getDueVocab({ limit: 20, language: reviewLang });
      sessionDone = 0;
    }

    // Przełącznik pokazujemy tylko wtedy, gdy naprawdę jest w czym wybierać.
    const everything = await S.getVocab({});
    const langs = [...new Set(everything.map((v) => v.target_language).filter(Boolean))];
    const switcher =
      langs.length > 1 ? `<div class="toolbar">${langChipsHtml(reviewLang, langs)}</div>` : "";
    const bindSwitcher = () =>
      el.querySelectorAll("[data-lang]").forEach((b) =>
        b.addEventListener("click", async () => {
          reviewLang = b.dataset.lang || null;
          queue = [];
          flipped = false;
          await renderHeader(); // liczniki muszą pójść za zmianą filtra
          renderReview();
        })
      );

    if (!queue.length) {
      const all = await S.getVocab({ language: reviewLang });
      if (!all.length) {
        const lang = C.findLanguage(reviewLang);
        el.innerHTML =
          switcher +
          emptyState(
            "🌱",
            lang ? `Brak słówek (${lang.name})` : "Album jest jeszcze pusty",
            "Otwórz dowolny artykuł, kliknij 🗣️ Linglerno — słówka z lekcji trafią tutaj automatycznie i wrócą do Ciebie w powtórkach."
          );
        bindSwitcher();
        return;
      }
      const next = all.slice().sort((a, b) => new Date(a.due_at) - new Date(b.due_at))[0];
      el.innerHTML =
        switcher +
        emptyState(
          "✅",
          "Na dziś wszystko powtórzone",
          `Masz ${all.length} słówek w tym zestawie. Następne wraca ${relFuture(next.due_at)}.`
        );
      bindSwitcher();
      return;
    }

    const v = queue[0];
    // Pomyłki wracają na koniec kolejki, więc „całość" rośnie w trakcie sesji.
    const done = sessionDone;
    const total = sessionDone + queue.length;
    const answer = flipped
      ? `<div class="card-answer">
           <div class="card-translation">${esc(v.translation || "—")}</div>
           ${v.example ? `<div class="card-example">${esc(v.example)}</div>` : ""}
           ${v.source_url ? `<div class="card-src"><a href="${esc(v.source_url)}" target="_blank" rel="noopener">z: ${esc(hostOf(v.source_url) || "źródło")}</a></div>` : ""}
         </div>`
      : `<div class="card-hint">kliknij, aby odsłonić</div>`;

    el.innerHTML = `
      ${switcher}
      <div class="review">
        <div class="review-progress"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div>
        <div class="card" id="flashcard">
          <div class="card-term">${esc(v.term)}</div>
          ${answer}
        </div>
        ${
          flipped
            ? `<div class="review-actions">
                 <button class="btn btn-bad" data-grade="0">Jeszcze nie</button>
                 <button class="btn btn-good" data-grade="1">Wiem ✓</button>
               </div>`
            : `<div class="review-actions"><button class="btn btn-primary" id="flipBtn">Pokaż odpowiedź</button></div>`
        }
        <div class="stat-l">${done} / ${total} w tej sesji</div>
      </div>`;

    const flip = () => {
      flipped = true;
      renderReview();
    };
    $("flashcard").addEventListener("click", flip);
    $("flipBtn")?.addEventListener("click", flip);
    el.querySelectorAll("[data-grade]").forEach((b) =>
      b.addEventListener("click", () => grade(b.dataset.grade === "1"))
    );
    bindSwitcher();
  }

  async function grade(correct) {
    const v = queue.shift();
    flipped = false;
    sessionDone += 1;
    const res = await S.reviewVocab(v.id, correct);
    // Pomyłka wraca na koniec kolejki – powtórka jeszcze w tej samej sesji.
    if (!correct) queue.push({ ...v, box: 0 });
    for (const b of res?.newBadges || []) toast(`${b.icon} Nowa odznaka: ${b.name}`);
    await renderHeader();
    await renderReview();
  }

  // Skróty klawiszowe: spacja odsłania, 1/2 ocenia.
  document.addEventListener("keydown", (e) => {
    if (activeTab !== "review" || !queue.length) return;
    if (e.code === "Space" && !flipped) {
      e.preventDefault();
      flipped = true;
      renderReview();
    } else if (flipped && (e.key === "1" || e.key === "2")) {
      grade(e.key === "2");
    }
  });

  // --- Zakładka: słownik ----------------------------------------------------
  async function renderVocab() {
    const el = $("panel-vocab");
    const all = await S.getVocab({});
    if (!all.length) {
      el.innerHTML = emptyState(
        "📖",
        "Brak słówek",
        "Każda lekcja Linglerno dokłada tu słownictwo i zwroty — bez ręcznego przepisywania."
      );
      return;
    }

    const langs = [...new Set(all.map((v) => v.target_language).filter(Boolean))];
    const items = await S.getVocab({ language: vocabLang, sort: vocabSort });

    const sortChips = [
      ["recent", "Najnowsze"],
      ["alpha", "A–Z"],
      ["box", "Najlepiej znane"],
    ]
      .map(([k, label]) => `<button class="chip" data-sort="${k}" aria-pressed="${vocabSort === k}">${label}</button>`)
      .join("");

    el.innerHTML = `
      <div class="toolbar">
        ${langChipsHtml(vocabLang, langs)}
        <span class="spacer"></span>
        ${sortChips}
      </div>
      <div class="grid">
        ${items
          .map(
            (v) => `
          <div class="vcard">
            <button class="vcard-del" data-del="${esc(v.id)}" title="Usuń">×</button>
            <div class="vcard-term">${esc(v.term)}</div>
            <div class="vcard-tr">${esc(v.translation)}</div>
            ${v.example ? `<div class="vcard-ex">${esc(v.example)}</div>` : ""}
            <div class="boxdots" title="Etap powtórek: ${v.box} z ${S.MAX_BOX}">
              ${Array.from({ length: S.MAX_BOX }, (_, i) => `<i class="${i < v.box ? "on" : ""}"></i>`).join("")}
            </div>
          </div>`
          )
          .join("")}
      </div>`;

    el.querySelectorAll("[data-lang]").forEach((b) =>
      b.addEventListener("click", () => {
        vocabLang = b.dataset.lang || null;
        renderVocab();
      })
    );
    el.querySelectorAll("[data-sort]").forEach((b) =>
      b.addEventListener("click", () => {
        vocabSort = b.dataset.sort;
        renderVocab();
      })
    );
    el.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        await S.deleteVocab(b.dataset.del);
        await renderHeader();
        renderVocab();
      })
    );
  }

  // --- Zakładka: kariera ----------------------------------------------------
  async function renderCareer() {
    const el = $("panel-career");
    const skills = await S.getSkillSummary();
    const lessons = await S.getLessons({ mode: "career", limit: 30 });

    if (!lessons.length) {
      el.innerHTML = emptyState(
        "🧭",
        "Mapa kompetencji jest pusta",
        "Kliknij 📖 My Career na dowolnym artykule. Każda lekcja oznacza, czego dotyczyła — po kilku tygodniach zobaczysz, w co naprawdę inwestujesz czas."
      );
      return;
    }

    // Pokrycie względem oficjalnych umiejętności zawodu. To jedyna metryka tutaj,
    // która mierzy coś poza samą częstotliwością czytania: ile z tego, czego
    // zawód naprawdę wymaga, w ogóle dotknąłeś.
    const occ = await E.getSavedOccupation();
    const touchedUris = new Set(skills.map((s) => s.uri).filter(Boolean));

    let coverageHtml = "";
    if (occ) {
      const ess = occ.essential || [];
      const opt = occ.optional || [];
      const covEss = ess.filter((s) => touchedUris.has(s.uri)).length;
      const covOpt = opt.filter((s) => touchedUris.has(s.uri)).length;
      const pct = ess.length ? Math.round((covEss / ess.length) * 100) : 0;
      const gaps = ess.filter((s) => !touchedUris.has(s.uri));

      coverageHtml = `
        <div class="cov">
          <div class="cov-head">
            <div>
              <div class="cov-occ">${esc(occ.title)}</div>
              <div class="stat-l">pokrycie umiejętności kluczowych</div>
            </div>
            <div class="cov-num">${covEss}<span>/${ess.length}</span></div>
          </div>
          <div class="skill-bar"><i style="width:${pct}%"></i></div>
          <div class="stat-l" style="margin-top:8px">
            Dodatkowo ${covOpt} z ${opt.length} umiejętności opcjonalnych.
          </div>
        </div>

        ${
          gaps.length
            ? `<div class="day-h">Luki — czego jeszcze nie tknąłeś (${gaps.length})</div>
               <div class="gap-tags">
                 ${gaps
                   .slice(0, 24)
                   .map(
                     (g) =>
                       `<a class="gap-tag gap-link" target="_blank" rel="noopener"
                           href="https://www.google.com/search?q=${encodeURIComponent(g.title + " kurs")}"
                           title="Poszukaj materiałów: ${esc(g.title)}">${esc(g.title)}</a>`
                   )
                   .join("")}
               </div>`
            : `<div class="gapbox">Wszystkie umiejętności kluczowe tego zawodu masz już ruszone. 🎉</div>`
        }`;
    } else {
      coverageHtml = `
        <div class="gapbox">
          <h3>Ustaw zawód, żeby mierzyć postęp</h3>
          <p class="stat-l" style="margin:0 0 10px">
            Bez zawodu widzisz tylko, jak często czytasz o czym. Po wybraniu zawodu z klasyfikacji
            ESCO lekcje mapują się na jego oficjalne umiejętności i widać, ile z nich pokryłeś.
          </p>
          <button class="btn btn-primary" id="goProfile">Wybierz zawód</button>
        </div>`;
    }

    const max = skills[0]?.count || 1;
    const skillsHtml = skills
      .map(
        (s) => `
      <div class="skill">
        <div class="skill-head">
          <span class="skill-tag">${s.essential ? "★ " : ""}${esc(s.tag)}</span>
          <span class="skill-count">${s.count} ${s.count === 1 ? "lekcja" : "lekcji"}</span>
        </div>
        <div class="skill-bar"><i style="width:${(s.count / max) * 100}%"></i></div>
        <div class="skill-srcs">
          ${s.sources
            .map(
              (src) =>
                `<a class="srclink" href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title || hostOf(src.url))}</a>`
            )
            .join("")}
        </div>
      </div>`
      )
      .join("");

    const recent = lessons
      .slice(0, 8)
      .map((l) => {
        const takeaways = (l.payload?.takeaways || []).slice(0, 2);
        return `
        <div class="lesson">
          <div class="lesson-head">
            <span class="lesson-mode">📖</span>
            <span class="lesson-topic">${esc(l.topic || l.source_title || "Lekcja")}</span>
            <span class="lesson-time">${dayLabel(S.dayKey(new Date(l.created_at)))}</span>
          </div>
          ${
            takeaways.length
              ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:13.5px;">${takeaways
                  .map((t) => `<li>${esc(String(t).replace(/\*\*/g, ""))}</li>`)
                  .join("")}</ul>`
              : ""
          }
          ${skillTagsHtml(l.skills)}
        </div>`;
      })
      .join("");

    el.innerHTML = `
      ${coverageHtml}
      ${skills.length ? `<div class="day-h">Czego dotknąłeś</div>${skillsHtml}` : ""}
      <div class="day-h">Ostatnie lekcje</div>
      ${recent}
      ${occ ? `<p class="attrib">Zawody i umiejętności: klasyfikacja ESCO (Komisja Europejska).</p>` : ""}`;

    $("goProfile")?.addEventListener("click", () => selectTab("profile"));
  }

  // --- Zakładka: historia ---------------------------------------------------
  async function renderHistory() {
    const el = $("panel-history");
    const lessons = await S.getLessons({ limit: 200 });
    if (!lessons.length) {
      el.innerHTML = emptyState("🗂️", "Brak historii", "Tu wylądują wszystkie lekcje — językowe i karierowe — z linkiem do strony, z której powstały.");
      return;
    }

    const activity = await S.getActivity(84);
    const heat = activity
      .map((a) => `<i data-n="${Math.min(a.count, 3)}" title="${dayLabel(a.day)}: ${a.count}"></i>`)
      .join("");

    const byDay = new Map();
    for (const l of lessons) {
      const key = S.dayKey(new Date(l.created_at));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(l);
    }

    const days = [...byDay.entries()]
      .map(
        ([day, items]) => `
      <div class="day-h">${esc(dayLabel(day))}</div>
      ${items
        .map(
          (l) => `
        <div class="lesson">
          <div class="lesson-head">
            <span class="lesson-mode">${l.mode === "lingo" ? "🗣️" : "📖"}</span>
            <span class="lesson-topic">${esc(l.topic || l.source_title || "Lekcja")}</span>
            <span class="lesson-time">${tf.format(new Date(l.created_at))}</span>
          </div>
          ${
            l.source_url
              ? `<a class="lesson-src" href="${esc(l.source_url)}" target="_blank" rel="noopener">${esc(l.source_title || l.source_url)}</a>`
              : ""
          }
          ${skillTagsHtml(l.skills)}
        </div>`
        )
        .join("")}`
      )
      .join("");

    el.innerHTML = `<div class="heat">${heat}</div>${days}`;
  }

  // --- Zakładka: profil -----------------------------------------------------
  // Wszystko, co personalizuje lekcje. Ustawienia wtyczki zostają techniczne
  // (silnik, klucz, adres serwera) – tu jest to, co użytkownik zmienia naprawdę.
  const PROFILE_FIELDS = [
    { key: "role", label: "Rola / stanowisko", placeholder: "np. analityk danych" },
    { key: "industry", label: "Branża / dziedzina", placeholder: "np. medtech" },
    { key: "goals", label: "Cele", placeholder: "np. zbudować startup EEG" },
    { key: "skills", label: "Umiejętności do rozwoju", placeholder: "np. SQL, negocjacje (po przecinku)" },
    { key: "interests", label: "Zainteresowania", placeholder: "np. AI, bieganie" },
  ];

  // Wybór zawodu z ESCO. Wyszukiwarka jest leksykalna, więc pokazujemy listę
  // trafień do wzrokowego wyboru zamiast zgadywać za użytkownika.
  function occupationBoxHtml(occ) {
    if (occ) {
      const n = (occ.essential?.length || 0) + (occ.optional?.length || 0);
      return `
        <div class="occ-current">
          <div>
            <div class="occ-title">${esc(occ.title)}</div>
            <div class="stat-l">${occ.essential?.length || 0} umiejętności kluczowych, ${occ.optional?.length || 0} opcjonalnych · ${n} łącznie</div>
          </div>
          <button class="btn" id="occClear">Zmień</button>
        </div>`;
    }
    return `
      <div class="occ-search">
        <input type="text" id="occQuery" placeholder="Wpisz zawód, np. hydraulik, analityk danych…" />
        <button class="btn btn-primary" id="occSearch">Szukaj</button>
      </div>
      <div class="stat-l" id="occHint">Lista zawodów pochodzi z ESCO — europejskiej klasyfikacji zawodów i umiejętności.</div>
      <div id="occResults"></div>`;
  }

  function bindOccupationBox(el, occ, onChange) {
    if (occ) {
      el.querySelector("#occClear")?.addEventListener("click", async () => {
        await E.clearOccupation();
        onChange();
      });
      return;
    }

    const run = async () => {
      const q = el.querySelector("#occQuery").value;
      const hint = el.querySelector("#occHint");
      const box = el.querySelector("#occResults");
      hint.textContent = "Szukam…";
      try {
        const results = await E.searchOccupations(q, "pl");
        hint.textContent = results.length
          ? "Wybierz najbliższy swojemu — nazwy w ESCO bywają urzędowe."
          : "Brak trafień. Spróbuj innego słowa.";
        box.innerHTML = results
          .map(
            (r) =>
              `<button class="occ-hit" data-uri="${esc(r.uri)}">${esc(r.title)}</button>`
          )
          .join("");
        box.querySelectorAll("[data-uri]").forEach((b) =>
          b.addEventListener("click", async () => {
            hint.textContent = "Pobieram umiejętności…";
            try {
              await E.selectOccupation(b.dataset.uri, "pl");
              onChange();
            } catch (err) {
              hint.textContent = `Nie udało się pobrać: ${err.message}`;
            }
          })
        );
      } catch (err) {
        hint.textContent = `Błąd wyszukiwania: ${err.message}`;
      }
    };

    el.querySelector("#occSearch").addEventListener("click", run);
    el.querySelector("#occQuery").addEventListener("keydown", (e) => {
      if (e.key === "Enter") run();
    });
  }

  async function renderProfile() {
    const el = $("panel-profile");
    const p = settings.profile || {};
    const occ = await E.getSavedOccupation();

    const nativeSel = p.nativeLangCode || C.codeFromLegacyName(p.nativeLang);
    const targetSel = p.targetLangCode || C.codeFromLegacyName(p.targetLang);

    const langOptions = (selected) =>
      `<option value="">— wybierz —</option>` +
      C.LANGUAGES.map(
        (l) => `<option value="${l.code}"${l.code === selected ? " selected" : ""}>${l.flag} ${esc(l.name)}</option>`
      ).join("");

    el.innerHTML = `
      <div class="form">
        <h3 class="form-h">Zawód — wyznacza umiejętności, po których mierzysz postęp</h3>
        ${occupationBoxHtml(occ)}

        <h3 class="form-h">Kariera — zasila zakładkę Kariera i tryb 📖 My Career</h3>
        ${PROFILE_FIELDS.map(
          (f) => `
          <label class="field">
            <span>${esc(f.label)}</span>
            <input type="text" data-pf="${f.key}" value="${esc(p[f.key] || "")}" placeholder="${esc(f.placeholder)}" />
          </label>`
        ).join("")}

        <h3 class="form-h">Języki — zasilają 🗣️ Linglerno i motyw tej strony</h3>
        <div class="field-row">
          <label class="field">
            <span>Twój język</span>
            <select data-pf="nativeLangCode">${langOptions(nativeSel)}</select>
          </label>
          <label class="field">
            <span>Język, którego się uczysz</span>
            <select data-pf="targetLangCode">${langOptions(targetSel)}</select>
          </label>
        </div>

        <label class="field">
          <span>Kraj / kultura</span>
          <input type="text" data-pf="country" value="${esc(p.country || "")}" placeholder="np. Włochy" />
        </label>

        <span class="field-label">Poziom</span>
        <div class="levels" id="lvlPicker">
          ${C.LEVELS.map(
            (l) => `
            <button type="button" class="lvl" data-level="${l.code}" aria-pressed="${(p.level || "A2") === l.code}">
              <b>${esc(l.label)}</b><span>${esc(l.description)}</span>
            </button>`
          ).join("")}
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" id="saveProfile">Zapisz profil</button>
          <span class="stat-l" id="saveMsg"></span>
        </div>
      </div>`;

    bindOccupationBox(el, occ, renderProfile);

    let level = p.level || "A2";
    el.querySelectorAll("#lvlPicker .lvl").forEach((b) =>
      b.addEventListener("click", () => {
        level = b.dataset.level;
        el.querySelectorAll("#lvlPicker .lvl").forEach((x) =>
          x.setAttribute("aria-pressed", String(x.dataset.level === level))
        );
      })
    );

    $("saveProfile").addEventListener("click", async () => {
      const next = { ...(settings.profile || {}), level };
      el.querySelectorAll("[data-pf]").forEach((i) => {
        next[i.dataset.pf] = i.value.trim();
      });
      // Nazwy językowe idą do promptu, kody sterują motywem i filtrami.
      next.nativeLang = C.ENGLISH_NAMES[next.nativeLangCode] || "";
      next.targetLang = C.ENGLISH_NAMES[next.targetLangCode] || "";

      const langChanged = next.targetLangCode !== (settings.profile || {}).targetLangCode;
      settings = { ...settings, profile: next };
      await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });

      // Zmiana języka nauki przestawia też filtry, żeby widok był spójny z profilem.
      if (langChanged) {
        vocabLang = currentLang();
        reviewLang = currentLang();
        queue = [];
      }
      await renderHeader();
      toast("Profil zapisany");
      $("saveMsg").textContent = "Zapisano ✓";
      setTimeout(() => ($("saveMsg").textContent = ""), 2000);
    });
  }

  // --- Zakładki -------------------------------------------------------------
  const RENDERERS = {
    review: renderReview,
    vocab: renderVocab,
    career: renderCareer,
    history: renderHistory,
    profile: renderProfile,
  };

  function selectTab(name) {
    activeTab = name;
    document.querySelectorAll(".tab").forEach((t) =>
      t.setAttribute("aria-selected", String(t.dataset.tab === name))
    );
    for (const key of Object.keys(RENDERERS)) $(`panel-${key}`).hidden = key !== name;
    RENDERERS[name]();
  }

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => selectTab(t.dataset.tab))
  );

  $("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("exportBtn").addEventListener("click", async () => {
    const data = await S.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `krytykai-biblioteka-${S.dayKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Wyeksportowano");
  });

  // --- Start ----------------------------------------------------------------
  (async () => {
    const data = await chrome.storage.sync.get(SETTINGS_KEY);
    settings = data[SETTINGS_KEY] || {};
    vocabLang = currentLang();
    reviewLang = currentLang();
    await renderHeader();

    // Bez ustawionego języka nauki nic sensownego nie pokażemy – zaczynamy
    // od profilu, żeby użytkownik od razu wiedział, czego brakuje.
    if (!currentLang()) {
      selectTab("profile");
      return;
    }
    const st = await S.getDashboardStats();
    selectTab(st.due_count > 0 || st.vocab_count === 0 ? "review" : "vocab");
  })();
})();
