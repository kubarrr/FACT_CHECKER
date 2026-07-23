// Persony (wirtualne profile kariery). CRUD i migracja działają na
// chrome.storage.local; jedyną funkcją sięgającą sieci (ESCO) jest
// setPersonaOccupation, której tu nie wołamy.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function installChromeMock() {
  const data = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const list = keys == null ? Object.keys(data) : Array.isArray(keys) ? keys : [keys];
          const out = {};
          for (const k of list) if (k in data) out[k] = data[k];
          return out;
        },
        async set(obj) { Object.assign(data, obj); },
        async remove(keys) { for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k]; },
      },
    },
  };
  return data;
}

beforeEach(() => {
  installChromeMock();
  vm.runInThisContext(readFileSync(join(root, "src/shared/esco.js"), "utf8"), { filename: "esco.js" });
});

const E = () => globalThis.KRYTYKAI_ESCO;

test("pierwsza persona jest 'prawdziwa', kolejne wirtualne", async () => {
  const a = await E().addPersona({ label: "Analityk" });
  const b = await E().addPersona({ label: "Rolnictwo" });
  assert.equal(a.real, true);
  assert.equal(b.real, false);
});

test("nowa persona staje się aktywna", async () => {
  await E().addPersona({ label: "A" });
  const b = await E().addPersona({ label: "B" });
  const active = await E().getActivePersona();
  assert.equal(active.id, b.id);
});

test("setActivePersona przełącza aktywną", async () => {
  const a = await E().addPersona({ label: "A" });
  await E().addPersona({ label: "B" });
  await E().setActivePersona(a.id);
  assert.equal((await E().getActivePersona()).id, a.id);
});

test("limit person to 4", async () => {
  for (let i = 0; i < 4; i++) await E().addPersona({ label: `P${i}` });
  await assert.rejects(() => E().addPersona({ label: "za dużo" }), /max/);
});

test("usunięcie aktywnej persony przełącza na inną", async () => {
  const a = await E().addPersona({ label: "A" });
  const b = await E().addPersona({ label: "B" }); // aktywna
  await E().removePersona(b.id);
  const active = await E().getActivePersona();
  assert.equal(active.id, a.id);
  assert.equal((await E().getPersonas()).length, 1);
});

test("updatePersona zmienia pola, nie ruszając aktywności", async () => {
  const a = await E().addPersona({ label: "A" });
  await E().addPersona({ label: "B" });
  await E().updatePersona(a.id, { role: "analityk", goals: "startup" });
  const p = (await E().getPersonas()).find((x) => x.id === a.id);
  assert.equal(p.role, "analityk");
  assert.equal(p.goals, "startup");
  // B pozostaje aktywna.
  assert.equal((await E().getActivePersona()).label, "B");
});

test("migracja: stary zawód + pola profilu → jedna prawdziwa persona", async () => {
  await chrome.storage.local.set({
    krytykai_occupation: { uri: "esco/o/1", title: "hydraulik", essential: [], optional: [], options: [] },
  });
  await E().ensureMigrated({ role: "hydraulik", industry: "budownictwo", goals: "własna firma" });

  const personas = await E().getPersonas();
  assert.equal(personas.length, 1);
  assert.equal(personas[0].real, true);
  assert.equal(personas[0].occupation.title, "hydraulik");
  assert.equal(personas[0].goals, "własna firma");
});

test("migracja jest idempotentna i nie odpala się gdy persony już są", async () => {
  await E().addPersona({ label: "istnieje" });
  await E().ensureMigrated({ role: "cokolwiek" });
  assert.equal((await E().getPersonas()).length, 1);
});

test("migracja nic nie tworzy, gdy nie ma danych kariery", async () => {
  await E().ensureMigrated({});
  assert.equal((await E().getPersonas()).length, 0);
});

test("getSavedOccupation zwraca zawód aktywnej persony (most wsteczny)", async () => {
  const a = await E().addPersona({ label: "A" });
  // Symulujemy ustawiony zawód bez sieci – zapisujemy bezpośrednio.
  await E().updatePersona(a.id, {
    occupation: { uri: "esco/o/2", title: "analityk", essential: [], optional: [], options: [] },
  });
  // updatePersona woła savePersonas → syncActiveOccupation, więc most jest ustawiony.
  const occ = await E().getSavedOccupation();
  assert.equal(occ.title, "analityk");
  // Most wsteczny (krytykai_occupation) też wskazuje aktywny zawód.
  const mirror = (await chrome.storage.local.get("krytykai_occupation")).krytykai_occupation;
  assert.equal(mirror.title, "analityk");
});
