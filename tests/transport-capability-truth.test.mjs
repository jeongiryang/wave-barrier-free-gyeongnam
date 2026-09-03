import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("교통 제공 상태는 실제로 호출한 공공데이터 범위만 표시한다", async () => {
  const [queries, model, fallback, constants] = await Promise.all([
    source("server/transport/public-provider-queries.ts"),
    source("server/transport/public-context-model.ts"),
    source("features/planner/view-model.ts"),
    source("features/planner/constants.ts"),
  ]);

  for (const operation of [
    "travelerTrainRunPlan2",
    "getCrdntPrxmtSttnList",
    "getSttnAcctoArvlPrearngeInfoList",
    "GetCtyCodeList",
    "GetExpBusTrminlList",
    "GetSuberbsBusTrminlList",
  ]) assert.match(queries, new RegExp(operation));

  for (const dataset of ["bus-stop", "bus-arrival", "train", "express", "intercity", "korail-plan"]) {
    assert.match(model, new RegExp(`id: "${dataset}"`));
  }
  for (const unsupported of ["bus-route", "bus-location", "subway", "express-arrival", "air", "ship", "carshare", "pm", "tago-mobility"]) {
    assert.doesNotMatch(model, new RegExp(`(?:id: )?"${unsupported}"`));
    assert.doesNotMatch(fallback, new RegExp(`(?:id: )?"${unsupported}"`));
    assert.doesNotMatch(constants, new RegExp(`(?:id: )?"${unsupported}"`));
  }
});

test("버스 도착 실패와 빈 결과는 같은 상태로 표시하지 않는다", async () => {
  const [queries, model] = await Promise.all([
    source("server/transport/public-provider-queries.ts"),
    source("server/transport/public-context-model.ts"),
  ]);
  assert.match(queries, /arrivals = await attempt/);
  assert.match(model, /arrivals\?\.ok[\s\S]*arrivalItems\.length \? "live" : "ready"[\s\S]*arrivals \? "error"/);
  assert.match(model, /transportProvider\("tago-bus-arrival"[\s\S]*arrivals\)/);
});
