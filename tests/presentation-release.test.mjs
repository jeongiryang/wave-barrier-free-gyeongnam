import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../features/preferences/presentation-release.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function enabled(mode, value) {
  const mod = { exports: {} };
  new Function("module", "exports", "process", "window", code)(mod, mod.exports, { env: { NODE_ENV: mode } }, {
    localStorage: { getItem: () => value },
  });
  return mod.exports.presentationOptionsEnabled();
}

test("Production cannot enable deferred presentation options even with a forged development opt-in", () => {
  for (const mode of ["production", "test", undefined]) for (const value of [null, "enabled", "true"]) {
    assert.equal(enabled(mode, value), false);
  }
});

test("ordinary local visitors use the public defaults; only explicitly isolated development contexts can exercise deferred variants", () => {
  assert.equal(enabled("development", null), false);
  assert.equal(enabled("development", "true"), false);
  assert.equal(enabled("development", "enabled"), true);
});
