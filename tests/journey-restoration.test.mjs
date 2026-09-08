import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../features/planner/hooks/useJourneyProgress.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function render(options, locale) {
  const effects = [], redirects = [];
  const mod = { exports: {} };
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name === "react") return { useCallback: fn => fn, useMemo: fn => fn(), useEffect: fn => effects.push(fn) };
    if (name.endsWith("reduced-motion.js")) return { scrollToSection() {} };
    if (name.endsWith("SitePreferences")) return { useSitePreferences: () => ({ locale }) };
    throw Error(name);
  });
  const result = mod.exports.useJourneyProgress({
    motion: "calm", observeSections: false, activeStepId: "itinerary",
    onActiveStepChange: step => redirects.push(step), selectedProfileCount: 0,
    recommendedCount: 0, savedCount: 0, currentSavedCount: 0,
    routeDestinationName: "", weatherReady: false, ...options,
  });
  effects.forEach(effect => effect());
  return { result, redirects };
}

for (const locale of ["ko", "en"]) {
  test(`${locale} a saved itinerary deep link survives storage hydration without a new search`, () => {
    assert.deepEqual(render({ tripReady: false }, locale).redirects, []);
    const restored = render({ tripReady: true, savedCount: 2 }, locale);
    assert.deepEqual(restored.redirects, []);
    assert.equal(restored.result.steps.find(step => step.id === "itinerary").available, true);
    assert.equal(restored.result.completedCount, 0, "restoration does not claim a reviewed trip");
    assert.equal(restored.result.steps.find(step => step.id === "places").available, false);
  });

  test(`${locale} a genuinely empty restored trip still locks later steps`, () => {
    assert.deepEqual(render({ tripReady: true }, locale).redirects, ["conditions"]);
    assert.deepEqual(render({ tripReady: true, searched: true }, locale).redirects, ["places"]);
    assert.deepEqual(render({ tripReady: false, activeStepId: "departure-readiness" }, locale).redirects, []);
    assert.deepEqual(render({ tripReady: true, activeStepId: "departure-readiness" }, locale).redirects, ["conditions"]);
  });
}
