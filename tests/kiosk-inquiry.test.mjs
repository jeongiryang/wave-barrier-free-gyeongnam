import test from "node:test";
import assert from "node:assert/strict";
import { inquiryOptions, defaultInquiryOptions } from "../lib/place-decision-tools.js";

test("ordering help is an optional inquiry rather than a claimed facility field", () => {
  const option = inquiryOptions.find(item => item.id === "ordering");
  assert.equal(option?.question, "무인 주문기만 있나요? 사람에게 주문할 수도 있나요?");
  assert.deepEqual(option?.keys, []);
  assert.equal(defaultInquiryOptions({ accessibility: [] }).includes("ordering"), false);
  assert.equal("hasKiosk" in option, false);
  assert.equal("staffOrder" in option, false);
});
