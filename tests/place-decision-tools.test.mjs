import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { toggleComparison, facilityComparison, defaultInquiryOptions, inquiryText, inquiryOptions } from "../lib/place-decision-tools.js";

test("comparison keeps at most three current unique places and frees a slot when removed", () => {
  const available = ["a", "b", "c", "d"];
  assert.deepEqual(toggleComparison(["a", "a", "old", "b"], "c", available), ["a", "b", "c"]);
  assert.deepEqual(toggleComparison(["a", "b", "c"], "d", available), ["a", "b", "c"]);
  assert.deepEqual(toggleComparison(["a", "b", "c"], "b", available), ["a", "c"]);
  assert.deepEqual(toggleComparison(["a"], "missing", available), ["a"]);
});

test("comparison preserves negative and missing evidence without inventing availability", () => {
  const row = facilityComparison([
    { accessibility: [{key:"route",label:"접근로",state:"confirmed",detail:"계단 없는 입구"}] },
    { accessibility: [{key:"route",label:"접근로",state:"negative",detail:"입구 계단 있음"}] },
    {},
  ], ["restroom", "route"]);
  assert.deepEqual(row.map(item=>item.key), ["restroom", "route"]);
  assert.equal(row[0].label, "장애인 화장실");
  assert.deepEqual(row[0].values.map(item=>item.state), ["unknown", "unknown", "unknown"]);
  assert.deepEqual(row[1].values.map(item=>item.state), ["confirmed", "negative", "unknown"]);
  assert.equal(row[1].values[1].detail, "입구 계단 있음");
});

test("inquiry defaults follow unconfirmed facility records, never inferred personal conditions", () => {
  assert.deepEqual(defaultInquiryOptions({}), ["hours"]);
  assert.deepEqual(defaultInquiryOptions({accessibility:[
    {key:"route",state:"confirmed"}, {key:"restroom",state:"unknown"}, {key:"elevator",state:"negative"},
  ]}), ["hours", "toilet", "elevator"]);
});

// 스펙 44: 1인 메뉴·단체석·좌석 형태를 주는 공공데이터가 없어 거르기 대신
// 문의 항목만 추가한다. 기존 일곱 항목의 순서·문구를 바꾸지 않고, 새 세
// 항목은 기본 선택이 아니어야 한다.
test("문의 항목 목록에 세 항목(좌석 형태·1인 주문·여럿 자리)이 추가됐고, 기존 일곱 항목의 순서와 문구는 그대로다", () => {
  const originalIds = ["hours", "stepfree", "toilet", "parking", "elevator", "rest", "guidance"];
  assert.deepEqual(inquiryOptions.slice(0, 7).map((option) => option.id), originalIds);
  const originalLabels = ["운영·입장 시간", "계단 없는 이동", "이용 가능한 화장실", "주차·승하차", "승강기", "앉아서 쉬기", "글·쉬운 안내"];
  assert.deepEqual(inquiryOptions.slice(0, 7).map((option) => option.label), originalLabels);
  const addedIds = inquiryOptions.slice(7).map((option) => option.id);
  assert.deepEqual(new Set(addedIds), new Set(["seating", "solo", "groupSeating"]));
  const seating = inquiryOptions.find((option) => option.id === "seating");
  const solo = inquiryOptions.find((option) => option.id === "solo");
  const group = inquiryOptions.find((option) => option.id === "groupSeating");
  assert.equal(solo.question, "혼자 먹을 수 있는 메뉴가 있나요?");
  assert.equal(group.question, "여러 명이 함께 앉을 자리가 있나요?");
  assert.equal(seating.question, "의자가 있는 자리가 있나요? 좌식만 있나요?");
});

test("기본 선택 항목은 새 세 질문이 추가돼도 바뀌지 않는다(자리 관련 질문은 절대 기본 선택되지 않는다)", () => {
  assert.deepEqual(defaultInquiryOptions({}), ["hours"]);
  const withUnconfirmed = defaultInquiryOptions({ accessibility: [
    { key: "route", state: "confirmed" }, { key: "restroom", state: "unknown" }, { key: "elevator", state: "negative" },
    { key: "signguide", state: "unknown" },
  ] });
  assert.deepEqual(withUnconfirmed.sort(), ["elevator", "guidance", "hours", "toilet"].sort());
  assert.equal(withUnconfirmed.includes("seating"), false);
  assert.equal(withUnconfirmed.includes("solo"), false);
  assert.equal(withUnconfirmed.includes("groupSeating"), false);
});

test("자리 관련 데이터 필드를 만들지 않는다: 모듈 소스에 soloMenu/groupSeating/seatingType 필드가 없다", () => {
  const source = readFileSync(fileURLToPath(new URL("../lib/place-decision-tools.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /soloMenu|seatingType/);
  assert.doesNotMatch(source, /partySize|groupSize|일행\s*수/);
});

test("이 모듈은 순수 모듈이다: 네트워크·저장소·위치 API를 참조하지 않는다", () => {
  const source = readFileSync(fileURLToPath(new URL("../lib/place-decision-tools.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|navigator\.geolocation/);
});

test("inquiry uses only chosen questions and bounded traveller text", () => {
  const text = inquiryText("공원", ["rest", "rest", "fake"], "  함께 쉬고 싶어요.  ");
  assert.match(text, /공원에 방문/);
  assert.equal(text.match(/잠시 앉아서/g).length, 1);
  assert.match(text, /함께 쉬고 싶어요\./);
  assert.doesNotMatch(text, /휠체어|fake|운영 여부/);
  assert.ok(inquiryText("장".repeat(200), [], "말".repeat(600)).length < 750);
});
