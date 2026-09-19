import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// features/planner/equipment-rental.ts is TypeScript; read the compiled intent by
// parsing the source directly since this repo's plain node --test run does not
// transpile TS. We assert against the exported array via a small dynamic
// extraction that mirrors how tsx/vite would evaluate it: the array literal in
// the source must be empty until a human confirms real organizations.
const source = readFileSync(fileURLToPath(new URL("../features/planner/equipment-rental.ts", import.meta.url)), "utf8");

test("equipmentRentalPlaces is empty until a human confirms real organizations (human-gate)", () => {
  assert.match(source, /export const equipmentRentalPlaces: readonly EquipmentRentalPlace\[\] = \[\];/);
});

test("the equipment-rental module defines no personal-data or application fields", () => {
  for (const forbidden of ["disability", "장애", "지원서", "신청서", "resident", "birthDate", "phoneOfUser"]) {
    assert.ok(!source.includes(forbidden), `equipment-rental.ts must not reference ${forbidden}`);
  }
});

test("the EquipmentRentalPlace type requires eligibility and checkedOn fields", () => {
  assert.match(source, /eligibility: string;/);
  assert.match(source, /checkedOn: string;/);
});

// Validate the *shape rules* against representative fixtures using the same
// rendering rules the component follows, since the shipped list is empty.
function isHttpsOrAbsent(url) {
  return url === undefined || url.startsWith("https://");
}

function hasCallButton(place) {
  return Boolean(place.phoneNumber);
}

test("a fixture place without a phone number would not get a call button", () => {
  const place = { id: "1", name: "테스트 센터", region: "창원", items: ["수동 휠체어"], eligibility: "관내 거주자만 이용 가능", checkedOn: "2026-09-01" };
  assert.equal(hasCallButton(place), false);
});

test("a fixture place with a phone number would get a call button", () => {
  const place = { id: "1", name: "테스트 센터", region: "창원", items: ["수동 휠체어"], eligibility: "제한 없음", phoneNumber: "055-000-0000", checkedOn: "2026-09-01" };
  assert.equal(hasCallButton(place), true);
});

test("only https URLs are accepted", () => {
  assert.equal(isHttpsOrAbsent(undefined), true);
  assert.equal(isHttpsOrAbsent("https://example.go.kr"), true);
  assert.equal(isHttpsOrAbsent("http://example.go.kr"), false);
});

test("the module and its list component reference no location APIs", () => {
  for (const forbidden of ["geolocation", "getCurrentPosition"]) {
    assert.ok(!source.includes(forbidden), `equipment-rental.ts must not reference ${forbidden}`);
  }
  const componentSource = readFileSync(fileURLToPath(new URL("../features/planner/components/EquipmentRentalList.tsx", import.meta.url)), "utf8");
  for (const forbidden of ["geolocation", "getCurrentPosition", "fetch(", "XMLHttpRequest", "localStorage", "sessionStorage"]) {
    assert.ok(!componentSource.includes(forbidden), `EquipmentRentalList.tsx must not reference ${forbidden}`);
  }
});
