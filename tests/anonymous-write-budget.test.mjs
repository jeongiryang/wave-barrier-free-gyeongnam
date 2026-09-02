import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  exceededWriteWindow,
  retryAfterSeconds,
  FEEDBACK_WRITE_BUDGET,
  TRIP_WRITE_BUDGET,
} from "../lib/trips/write-budget.js";
import { rateLimitResponse } from "../lib/rate-limit-response.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("write budgets allow ordinary sharing traffic", () => {
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, { burst: 0, sustained: 0 }), "");
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, { burst: 19, sustained: 89 }), "");
  assert.equal(exceededWriteWindow(FEEDBACK_WRITE_BUDGET, { burst: 9, sustained: 44 }), "");
});

test("write budgets stop both bursts and steady flooding", () => {
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, { burst: 20, sustained: 20 }), "burst");
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, { burst: 1, sustained: 90 }), "sustained");
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, { burst: 999, sustained: 999 }), "burst");
  assert.equal(exceededWriteWindow(FEEDBACK_WRITE_BUDGET, { burst: 10, sustained: 0 }), "burst");
  assert.equal(exceededWriteWindow(FEEDBACK_WRITE_BUDGET, { burst: 0, sustained: 45 }), "sustained");
});

test("write budgets treat missing or malformed counts as no traffic", () => {
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, {}), "");
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, undefined), "");
  assert.equal(exceededWriteWindow(TRIP_WRITE_BUDGET, { burst: "3", sustained: "4" }), "");
});

test("rejected writes tell the caller how long the window is", () => {
  assert.equal(retryAfterSeconds(TRIP_WRITE_BUDGET, "burst"), 60);
  assert.equal(retryAfterSeconds(TRIP_WRITE_BUDGET, "sustained"), 600);
  assert.equal(retryAfterSeconds(FEEDBACK_WRITE_BUDGET, "burst"), 60);
});

test("all rate limits expose a no-store 429 contract", async () => {
  const response = rateLimitResponse("잠시 후 다시 시도해 주세요.", 600);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "600");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), { error: "잠시 후 다시 시도해 주세요.", retryAfter: 600 });
});

test("anonymous storage paths check the budget before inserting", async () => {
  const [itinerary, feedback, guard, database] = await Promise.all([
    source("server/trips/itinerary-actions.ts"),
    source("server/trips/feedback-handler.ts"),
    source("server/trips/write-budget.ts"),
    source("server/trips/database.ts"),
  ]);
  // 예산 확인이 INSERT보다 앞에 있어야 의미가 있다.
  assert.ok(itinerary.indexOf("sharedTripWriteRejection") < itinerary.indexOf("INSERT INTO itineraries"));
  assert.ok(feedback.indexOf("feedbackWriteRejection") < feedback.indexOf("INSERT INTO place_feedback"));
  assert.match(guard, /rateLimitResponse/);
  // 세는 것은 저장소 전체의 최근 쓰기량뿐이다. 요청자 식별값은 남기지 않는다.
  assert.doesNotMatch(guard, /x-forwarded-for|x-real-ip|cf-connecting-ip|user-agent/i);
  assert.match(database, /itineraries_created_idx/);
  assert.match(database, /place_feedback_created_idx/);
});
