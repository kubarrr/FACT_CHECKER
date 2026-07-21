// Zabezpieczenie przed rozjechaniem promptów: kopie w backendzie i PWA muszą być
// identyczne ze wspólnym źródłem prawdy (src/shared/prompt.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("backend/prompt.js is identical to src/shared/prompt.js", () => {
  assert.equal(read("backend/prompt.js"), read("src/shared/prompt.js"));
});

test("pwa/prompt.js is identical to src/shared/prompt.js", () => {
  assert.equal(read("pwa/prompt.js"), read("src/shared/prompt.js"));
});
