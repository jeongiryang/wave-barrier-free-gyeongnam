import assert from "node:assert/strict";
import test from "node:test";
import { toggleComparison, facilityComparison, defaultInquiryOptions, inquiryText } from "../lib/place-decision-tools.js";

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

test("inquiry uses only chosen questions and bounded traveller text", () => {
  const text = inquiryText("공원", ["rest", "rest", "fake"], "  함께 쉬고 싶어요.  ");
  assert.match(text, /공원에 방문/);
  assert.equal(text.match(/잠시 앉아서/g).length, 1);
  assert.match(text, /함께 쉬고 싶어요\./);
  assert.doesNotMatch(text, /휠체어|fake|운영 여부/);
  assert.ok(inquiryText("장".repeat(200), [], "말".repeat(600)).length < 750);
});
