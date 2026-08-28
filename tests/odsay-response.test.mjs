import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { odsayProviderStatus, readOdsayResponse } from "../lib/transport/odsay-response.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("정상 응답에서 경로를 읽는다", () => {
  const { paths, error } = readOdsayResponse({ result: { path: [{ info: {} }, { info: {} }] } });
  assert.equal(error, null);
  assert.equal(paths.length, 2);
});

test("HTTP 200에 실린 오류 봉투를 오류로 읽는다", () => {
  // ODsay는 인증 실패를 HTTP 오류가 아니라 200 + 오류 봉투로 돌려준다.
  const { paths, error } = readOdsayResponse({ error: { code: "500", msg: "Invalid API Key." } });
  assert.equal(paths.length, 0);
  assert.deepEqual(error, { code: "500", message: "Invalid API Key." });
});

test("경로가 없는 정상 응답은 오류가 아니다", () => {
  assert.deepEqual(readOdsayResponse({ result: { path: [] } }), { paths: [], error: null });
  assert.deepEqual(readOdsayResponse({}), { paths: [], error: null });
  assert.deepEqual(readOdsayResponse(null), { paths: [], error: null });
});

test("키가 없으면 상태를 건드리지 않는다", () => {
  // 선택 사항으로 표시된 제공기관을 실패로 바꾸면 안 된다.
  assert.equal(odsayProviderStatus({ configured: false }), null);
  assert.equal(odsayProviderStatus({ configured: false, failure: "타임아웃" }), null);
});

test("네 가지 상황이 서로 다른 상태로 구분된다", () => {
  const configured = { configured: true };
  const noKey = odsayProviderStatus({ configured: false });
  const badKey = odsayProviderStatus({ ...configured, error: { code: "500", message: "Invalid API Key." } });
  const upstreamDown = odsayProviderStatus({ ...configured, failure: "ODsay 응답 503" });
  const noRoute = odsayProviderStatus({ ...configured, routeCount: 0 });
  const found = odsayProviderStatus({ ...configured, routeCount: 3 });

  assert.equal(noKey, null);
  assert.equal(badKey?.state, "error");
  assert.match(badKey.detail, /Invalid API Key/);
  assert.equal(upstreamDown?.state, "error");
  assert.match(upstreamDown.detail, /503/);
  assert.equal(noRoute?.state, "ready");
  assert.equal(found?.state, "connected");

  // 예전에는 이 넷이 모두 빈 배열로 수렴해 구분되지 않았다.
  const details = new Set([badKey.detail, upstreamDown.detail, noRoute.detail, found.detail]);
  assert.equal(details.size, 4, "상황마다 다른 안내가 나와야 한다");
});

test("경로 API가 ODsay 상태를 실제로 반영한다", async () => {
  const [handler, odsay] = await Promise.all([
    source("server/transport/handler.ts"),
    source("server/transport/odsay.ts"),
  ]);
  assert.match(odsay, /readOdsayResponse\(/);
  assert.match(odsay, /odsayProviderStatus\(/);
  assert.match(odsay, /provider: ProviderStatusUpdate \| null/);
  // kakao-drive만 갱신하면 ODsay 줄은 언제나 키 설정값 그대로 남는다.
  assert.match(handler, /\["odsay", odsayResult\.provider\]/);
  assert.doesNotMatch(odsay, /if \(!apiKey\) return \[\];/);
});
