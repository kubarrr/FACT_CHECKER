// Sito lokalne dla komentarzy. Ta warstwa decyduje, co w ogóle trafia do
// modelu, więc jej błąd kosztuje albo pieniądze (przepuszcza śmieci), albo
// jakość (odsiewa sensowne wypowiedzi).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

beforeEach(() => {
  // Moduł dotyka `location`/`document` dopiero w collect(), którego tu nie
  // wywołujemy — wystarczą atrapy, żeby skrypt się wykonał.
  globalThis.location = { hostname: "example.com" };
  globalThis.document = { querySelectorAll: () => [] };
  vm.runInThisContext(readFileSync(join(root, "src/shared/comments.js"), "utf8"), {
    filename: "src/shared/comments.js",
  });
});

const P = () => globalThis.KRYTYKAI_COMMENTS;

test("odsiewa wypowiedzi bez treści", () => {
  const noise = ["👏👏👏", "XDDDD", "!!!!!!!", "no i chuj", "🔥", "ok"];
  for (const t of noise) {
    assert.equal(P().prescore(t).noise, true, `powinno odpaść: ${t}`);
  }
});

test("przepuszcza wypowiedzi z argumentacją", () => {
  const good = [
    "Nie zgadzam się, ponieważ w badaniu z 2023 roku próba wynosiła tylko 40 osób, co przy tak szerokich wnioskach jest za mało.",
    "Actually this is wrong — the study they cite was retracted in 2019, source: pubmed.ncbi.nlm.nih.gov/12345",
    "Pracuję w tej branży od 12 lat i w praktyce wygląda to inaczej: koszt wdrożenia to zwykle dwukrotność wyceny.",
  ];
  for (const t of good) {
    const r = P().prescore(t);
    assert.equal(r.noise, false, `nie powinno odpaść: ${t.slice(0, 40)}`);
    assert.ok(r.score > 0, "sensowna wypowiedź powinna mieć dodatni wynik");
  }
});

test("ostry ton nie dyskwalifikuje wypowiedzi z argumentem", () => {
  // Kluczowe dla produktu: mocna krytyka merytoryczna to nie jest szum.
  const blunt =
    "To jest kompletna bzdura i autor powinien się wstydzić, ponieważ myli korelację z przyczynowością — dane z GUS pokazują odwrotny trend od 2019 roku.";
  const r = P().prescore(blunt);
  assert.equal(r.noise, false);
  assert.ok(r.flags.includes("reasoning"));
});

test("krzyk samymi wersalikami obniża wynik, ale sam nie przesądza", () => {
  const shout = P().prescore("TO JEST SKANDAL I HAŃBA DLA CAŁEJ BRANŻY");
  assert.ok(shout.flags.includes("shouting"));
  const shoutWithReason = P().prescore(
    "TO JEST SKANDAL, ponieważ ustawa z 2021 roku wprost tego zakazuje, a nikt nie poniósł konsekwencji."
  );
  assert.equal(shoutWithReason.noise, false);
});

test("prepareBatch dzieli na odsiane i wysyłane, z limitem budżetu", () => {
  const items = [
    { id: "c0", text: "👏" },
    { id: "c1", text: "Nie zgadzam się, ponieważ dane z 2024 roku pokazują coś innego niż w artykule." },
    { id: "c2", text: "XD" },
    { id: "c3", text: "Warto dodać, że według raportu NIK koszty były o 30% wyższe niż zakładano." },
  ];
  const { batch, dropped, kept } = P().prepareBatch(items, { budget: 10 });

  assert.equal(dropped.length, 2, "dwa emotikonowe powinny odpaść");
  assert.equal(kept.length, 2);
  assert.equal(batch.length, 2);
  // Partia jest posortowana malejąco – najlepsze idą pierwsze przy limicie.
  assert.ok(batch[0].score >= batch[1].score);
});

test("prepareBatch nie przekracza budżetu wywołania", () => {
  const many = Array.from({ length: 120 }, (_, i) => ({
    id: `c${i}`,
    text: `Sensowny komentarz numer ${i}, ponieważ zawiera uzasadnienie i konkretne liczby: ${i * 7}.`,
  }));
  const { batch } = P().prepareBatch(many, { budget: 40 });
  assert.equal(batch.length, 40);
});

test("prescore nie wywraca się na pustych i dziwnych danych", () => {
  for (const v of [undefined, null, "", "   ", 123, {}]) {
    assert.doesNotThrow(() => P().prescore(v));
  }
});
