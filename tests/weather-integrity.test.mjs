import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../server/weather/model.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { normalizeWeatherForecast } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const valid = () => ({ current: { temperature_2m: 0, apparent_temperature: -2, weather_code: 0, wind_speed_10m: 0, precipitation: 0, is_day: 1 }, daily: { time: ["2026-09-05"], weather_code: [0], temperature_2m_max: [3], temperature_2m_min: [-2], precipitation_probability_max: [0], rain_sum: [0], snowfall_sum: [0], uv_index_max: [0] } });

test("valid zero readings remain real values, not missing observations", () => {
  const data = normalizeWeatherForecast(valid(), "창원");
  assert.equal(data.current.temperature, 0);
  assert.equal(data.current.label, "맑음");
  assert.equal(data.days[0].rainProbability, 0);
});
test("missing weather never turns into clear skies, zero rain, or a fabricated temperature", () => {
  assert.throws(() => normalizeWeatherForecast({}, "창원"));
  for (const missing of [null, undefined, "", Number.NaN]) {
    const raw = valid(); raw.current.weather_code = missing;
    assert.throws(() => normalizeWeatherForecast(raw, "창원"));
  }
  const raw = valid(); raw.daily.precipitation_probability_max = [];
  assert.throws(() => normalizeWeatherForecast(raw, "창원"));
});
test("invalid forecast dates fail before they can crash the calendar", () => {
  const raw = valid(); raw.daily.time = ["2026-02-30"];
  assert.throws(() => normalizeWeatherForecast(raw, "창원"));
});
