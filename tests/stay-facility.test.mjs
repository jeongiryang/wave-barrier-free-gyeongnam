import assert from "node:assert/strict";
import test from "node:test";
import { groupStayFacilities } from "../lib/stay-facility.js";

test("숙소 편의 항목을 들어가기/객실과 욕실/머무는 동안 세 묶음으로 나눈다", () => {
  const groups = groupStayFacilities([
    { key: "route", label: "접근로", state: "confirmed", detail: "계단 없음" },
    { key: "elevator", label: "승강기", state: "unknown" },
    { key: "parking", label: "장애인 주차구역", state: "negative" },
    { key: "restroom", label: "장애인 화장실", state: "confirmed" },
    { key: "hearingroom", label: "청각 지원 객실", state: "unknown" },
    { key: "checkIn", label: "입실 시간", state: "confirmed", detail: "15:00" },
    { key: "checkOut", label: "퇴실 시간", state: "confirmed", detail: "11:00" },
  ]);
  assert.deepEqual(groups.map((group) => group.id), ["entry", "room", "stay"]);
  assert.deepEqual(groups[0].items.map((item) => item.key), ["route", "elevator", "parking"]);
  assert.deepEqual(groups[1].items.map((item) => item.key), ["restroom", "hearingroom"]);
  assert.deepEqual(groups[2].items.map((item) => item.key), ["checkIn", "checkOut"]);
});

test("항목이 하나도 없는 묶음은 결과에 남기지 않는다", () => {
  const groups = groupStayFacilities([{ key: "route", label: "접근로", state: "confirmed" }]);
  assert.deepEqual(groups.map((group) => group.id), ["entry"]);
  assert.equal(groups.some((group) => group.items.length === 0), false);
});

test("입력이 비어 있으면 빈 배열을 돌려주고, 알 수 없는 키는 조용히 건너뛴다", () => {
  assert.deepEqual(groupStayFacilities([]), []);
  assert.deepEqual(groupStayFacilities(undefined), []);
  assert.deepEqual(groupStayFacilities([{ key: "wheelchair", label: "휠체어 대여", state: "confirmed" }]), []);
});

test("미확인 상태를 없음으로 바꾸지 않는다", () => {
  const groups = groupStayFacilities([{ key: "elevator", label: "승강기", state: "unknown" }]);
  assert.equal(groups[0].items[0].state, "unknown");
});

test("숙소 전용 키를 새로 만들지 않는다: 결과 항목의 key는 입력에 있던 값만 쓴다", () => {
  const input = [
    { key: "route", label: "접근로", state: "confirmed" },
    { key: "checkIn", label: "입실 시간", state: "confirmed" },
  ];
  const groups = groupStayFacilities(input);
  const outputKeys = groups.flatMap((group) => group.items.map((item) => item.key));
  assert.deepEqual(new Set(outputKeys), new Set(input.map((item) => item.key)));
});
