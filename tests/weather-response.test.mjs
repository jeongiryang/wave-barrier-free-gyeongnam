import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../features/planner/weather-data.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { weatherResponse } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const valid = () => ({ region: "창원", source: "Open-Meteo", updatedAt: "2026-09-06T00:00:00Z", current: { temperature: 0, apparent: -2, code: 0, label: "맑음", wind: 0, precipitation: 0, isDay: true }, days: [{ date: "2026-09-06", code: 0, label: "맑음", min: -2, max: 3, rainProbability: 0, rain: 0, snow: 0, uv: 0, advice: [] }], advice: [] });

test("weather responses preserve real zero readings and unknown condition codes", () => {
  const data = valid();
  assert.equal(weatherResponse(data), data);
  data.current.code = 999;
  assert.equal(weatherResponse(data), data);
});

test("malformed weather is unavailable rather than crashing the planner or fabricating clear weather", () => {
  for (const body of [null, {}, [], { current: null, days: [] }, { ...valid(), days: [] }, { ...valid(), updatedAt: "invalid" }]) assert.equal(weatherResponse(body), null);
  for (const field of ["temperature", "apparent", "code", "wind", "precipitation"]) {
    for (const value of [null, undefined, "0", NaN, Infinity]) {
      const data = valid(); data.current[field] = value;
      assert.equal(weatherResponse(data), null);
    }
  }
  for (const change of [{ date: "2026-02-30" }, { max: -3 }, { rainProbability: 101 }, { snow: -1 }, { advice: [null] }, { code: 1.5 }]) {
    const data = valid(); Object.assign(data.days[0], change);
    assert.equal(weatherResponse(data), null);
  }
  const duplicate = valid(); duplicate.days.push({ ...duplicate.days[0] });
  assert.equal(weatherResponse(duplicate), null);
  const missingRegion = valid(); delete missingRegion.region;
  assert.equal(weatherResponse(missingRegion), null);
});
