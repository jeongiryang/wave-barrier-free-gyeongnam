import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";
import * as budgets from "../lib/request-budget.js";
import * as indoor from "../lib/indoor-evidence.js";

const code = ts.transpileModule(readFileSync(new URL("../server/tourism/visit-info.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const common = { contentid: "1001", contenttypeid: "14", lDongRegnCd: "48", mapx: "128.691", mapy: "35.238" };
const intro = { contentid: "1001", contenttypeid: "14", usetimeculture: "09:00~18:00", restdateculture: "월요일", usefee: "성인 1,000원", infocenterculture: "055-123-4567" };
async function run({ id = "1001", commonItems = [common], introItems = [intro], errorAt, partialAt, timeoutAt } = {}) {
  const mod = { exports: {} }, calls = [];
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("indoor-evidence.js")) return indoor;
    if (name.endsWith("request-budget.js")) return timeoutAt ? { ...budgets, SERVER_BUDGET_MS: { ...budgets.SERVER_BUDGET_MS, visitInfo: 8 } } : budgets;
    if (name.endsWith("/http")) return { json: (body, status = 200, cache = false) => ({ body, status, cache }), clean: (value, max = 240) => String(value ?? "").replace(/<[^>]*>/g, "").slice(0, max) };
    if (name.endsWith("/provider-data")) return {
      commonParams: () => ({ numOfRows: "1" }),
      fetchTourismData: async (...args) => { calls.push(args.slice(1, 4)); if (args[2] === timeoutAt) return new Promise(() => {}); return { items: args[2] === "detailCommon2" ? commonItems : introItems, partial: args[2] === partialAt, failed: args[2] === errorAt }; },
      attemptProvider: async promise => { const value = await promise; return value.failed ? { ok: false } : { ok: true, value }; },
    };
    throw Error(name);
  });
  const response = await mod.exports.handleVisitInfo(new URL(`https://wave.test/api/wave?action=visit-info&contentId=${encodeURIComponent(id)}&contentTypeId=39&lat=37.4&date=2026-09-11`), {});
  return { ...response, calls };
}
test("requested public ID is bound to official Gyeongnam type and exact introduction", async () => {
  const result = await run();
  assert.equal(result.status, 200); assert.equal(result.cache, true);
  assert.equal(result.body.hours, intro.usetimeculture); assert.equal(result.body.fees, intro.usefee);
  assert.equal(result.body.restDays, "월요일"); assert.equal(result.body.source, "ⓒ한국관광공사");
  assert.ok(Number.isFinite(Date.parse(result.body.checkedAt)));
  assert.equal(result.calls.length, 2);
  assert.deepEqual(result.calls[1], ["KorService2", "detailIntro2", { numOfRows: "1", contentId: "1001", contentTypeId: "14" }]);
  assert.doesNotMatch(JSON.stringify(result.calls), /37\.4|2026-09-11|profiles|serviceKey/);
});
test("invalid IDs, other regions and unknown coordinates never fan out", async () => {
  for (const id of ["", "0", "1001&x=y", "1001,1002", "1234567890123"]) { const result = await run({ id }); assert.equal(result.status, 400); assert.equal(result.calls.length, 0); }
  for (const place of [{ ...common, lDongRegnCd: "11", areacode: "38" }, { ...common, lDongRegnCd: "", areacode: "38" }, { ...common, lDongRegnCd: undefined }, { ...common, mapx: "" }, { ...common, mapx: "139.7" }]) { const result = await run({ commonItems: [place] }); assert.equal(result.body.status, "location-unconfirmed"); assert.equal(result.calls.length, 1); assert.equal(result.cache, false); }
});
test("provider failure, empty records, mismatch and partial data remain distinct", async () => {
  for (const operation of ["detailCommon2", "detailIntro2"]) for (const type of ["errorAt", "partialAt"]) { const result = await run({ [type]: operation }); assert.equal(result.status, 502); assert.equal(result.cache, false); }
  for (const options of [{ commonItems: [] }, { introItems: [] }]) assert.equal((await run(options)).body.status, "empty");
  for (const options of [{ commonItems: [{ ...common, contentid: "9999" }] }, { introItems: [{ ...intro, contentid: "9999" }] }, { introItems: [{ ...intro, contenttypeid: "39" }] }]) assert.equal((await run(options)).body.status, "invalid-response");
});
test("festival price is never mislabelled as hours and lodging is not treated as daily opening", async () => {
  const festival = await run({ commonItems: [{ ...common, contenttypeid: "15" }], introItems: [{ contentid: "1001", contenttypeid: "15", playtime: "18:00~20:00", usetimefestival: "무료", eventstartdate: "20260912", eventenddate: "20260913" }] });
  assert.equal(festival.body.hours, "18:00~20:00"); assert.equal(festival.body.fees, "무료"); assert.equal(festival.body.eventStart, "20260912");
  const lodging = await run({ commonItems: [{ ...common, contenttypeid: "32" }], introItems: [{ contentid: "1001", contenttypeid: "32", checkintime: "15:00", checkouttime: "11:00" }] });
  assert.equal(lodging.body.hours, ""); assert.equal(lodging.body.checkIn, "15:00"); assert.equal(lodging.body.checkOut, "11:00");
});
test("provider strings are bounded and unsupported types do not trigger introduction calls", async () => {
  const result = await run({ introItems: [{ ...intro, usetimeculture: "x".repeat(5000), infocenterculture: "y".repeat(500) }] });
  assert.equal(result.body.hours.length, 1200); assert.equal(result.body.phone.length, 160);
  const unsupported = await run({ commonItems: [{ ...common, contenttypeid: "unknown" }] });
  assert.equal(unsupported.body.status, "unsupported"); assert.equal(unsupported.calls.length, 1);
});

test("a shared lookup ignoring cancellation cannot hold the response beyond its total budget", async () => {
  for (const timeoutAt of ["detailCommon2", "detailIntro2"]) {
    const result = await run({ timeoutAt });
    assert.equal(result.status, 502); assert.equal(result.body.status, "provider-error"); assert.equal(result.cache, false);
    assert.equal(result.calls.length, timeoutAt === "detailCommon2" ? 1 : 2);
  }
});
