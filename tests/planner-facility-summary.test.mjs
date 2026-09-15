import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("planner uses the clear leisure sports label", async () => {
  const constants = await source("features/planner/constants.ts");
  assert.match(constants, /id: "leisure", label: "레저스포츠"/);
  assert.doesNotMatch(constants, /id: "leisure", label: "레포츠"/);
});

test("places with incomplete data expose confirmed selectable facilities with an accessible disclosure", async () => {
  const [row, summary] = await Promise.all([
    source("features/planner/components/PlaceResultRow.tsx"),
    source("features/planner/components/PlaceFacilitySummary.tsx"),
  ]);

  assert.match(row, /highlightConfirmed=\{unknown\}/);
  assert.match(summary, /selectableFacilityKeys\.has\(item\.key\)/);
  assert.match(summary, /이 장소에서 확인된 편의/);
  assert.match(summary, /confirmedItems\.length >= 3/);
  assert.match(summary, /confirmedItems\.slice\(0, 2\)/);
  assert.match(summary, /<details className="facility-confirmed-more">/);
  assert.match(summary, /확인된 편의 \$\{additionalConfirmed\.length\}개 더보기/);
});
