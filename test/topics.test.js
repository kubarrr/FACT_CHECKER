// Klasyfikator baniek informacyjnych – czysta logika słów kluczowych.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

beforeEach(() => {
  vm.runInThisContext(readFileSync(join(root, "src/shared/topics.js"), "utf8"), { filename: "topics.js" });
});

const T = () => globalThis.KRYTYKAI_TOPICS;

test("klasyfikuje treści do właściwych baniek (PL i EN)", () => {
  assert.equal(T().classify("Real Madryt wygrał mecz ligi mistrzów")?.id, "sport");
  assert.equal(T().classify("Rząd przyjął ustawę, prezydent podpisał")?.id, "politics");
  assert.equal(T().classify("New machine learning model beats benchmarks")?.id, "tech");
  assert.equal(T().classify("Przepis na tiramisu: mascarpone i biszkopty")?.id, "food");
  assert.equal(T().classify("Best beaches for your next vacation trip")?.id, "travel");
});

test("brak trafienia → null (temat nierozpoznany)", () => {
  assert.equal(T().classify("zxcv qwerty asdf"), null);
  assert.equal(T().classify(""), null);
});

test("wybiera bańkę z największą liczbą trafień", () => {
  // Więcej sygnałów sportowych niż politycznych → sport.
  const r = T().classify("mecz piłka gol liga — minister skomentował wynik");
  assert.equal(r.id, "sport");
});

test("aggregate: udziały, martwe pola i nieznane", () => {
  const texts = [
    "mecz piłka liga",          // sport
    "gol turniej tenis",        // sport
    "rząd wybory sejm",         // politics
    "przepis kuchnia gotowanie",// food
    "zzz nieznane brzmienie",   // unknown
  ];
  const { bubbles, blind, unknown, total } = T().aggregate(texts);

  assert.equal(total, 4);
  assert.equal(unknown, 1);
  assert.equal(bubbles[0].id, "sport"); // najwięcej
  assert.equal(bubbles[0].count, 2);
  assert.ok(Math.abs(bubbles[0].share - 0.5) < 1e-9);
  // Martwe pola zawierają tematy bez trafień (np. podróże, zdrowie).
  const blindIds = blind.map((b) => b.id);
  assert.ok(blindIds.includes("travel"));
  assert.ok(blindIds.includes("health"));
  // A te, które wystąpiły, NIE są w martwych polach.
  assert.ok(!blindIds.includes("sport"));
  assert.ok(!blindIds.includes("politics"));
});

test("aggregate pustej listy nie wywala się", () => {
  const r = T().aggregate([]);
  assert.equal(r.total, 0);
  assert.equal(r.bubbles.length, 0);
  assert.equal(r.blind.length, T().TOPICS.length); // wszystko to martwe pola
});
