import assert from "node:assert/strict";
import test from "node:test";
import { routeResultNotice, routeTitle } from "../features/planner/route-copy.ts";
import { transitDetail } from "../features/planner/transit-detail.ts";
import { hasJourneyEstimate } from "../lib/route-estimates.js";
import { odsayProviderStatus } from "../lib/transport/odsay-response.js";
import { providerFailureMessage } from "../lib/provider-failure.js";

test("route summaries retain structured restrictions across language changes without provider text", () => {
  for (const kind of ["rate_limited", "quota_exhausted", "auth_error", "access_restricted", "timeout", "upstream_error", "malformed_response", "missing_config"]) {
    const failure = { kind };
    for (const detail of ["", "untrusted upstream text", providerFailureMessage(failure)]) {
      for (const english of [false, true]) {
        const message = transitDetail(detail, english, failure);
        assert.equal(message, providerFailureMessage(failure, english));
        assert.doesNotMatch(message, /untrusted upstream text/);
        if (english) assert.doesNotMatch(message, /[가-힣]/);
      }
    }
  }
});

test("ODsay validation, empty and upstream failures stay distinct in both languages", () => {
  const messages = new Set();
  for (const code of ["MISSING_COORDINATES", "OUTSIDE_COORDINATES", "ENDPOINT_MISMATCH", "MISSING_CONNECTION", "INVALID_ROUTE", "INTERCITY_INCOMPLETE", "-99", "500"]) {
    const status = odsayProviderStatus({ configured: true, error: { code, message: "untrusted upstream text" } });
    assert.equal(transitDetail(status.detail, false), status.detail);
    const english = transitDetail(status.detail, true);
    assert.doesNotMatch(english, /[가-힣]|untrusted upstream text/);
    assert.match(english, /external map/);
    messages.add(english);
  }
  assert.equal(messages.size, 8);
});

test("journey estimates reject nonfinite, zero, negative, string and preview times", () => {
  for (const totalTime of [0, -1, NaN, Infinity, -Infinity, "25", null, undefined]) {
    const route = { configured: true, totalTime };
    assert.equal(hasJourneyEstimate(route), false);
    assert.match(routeResultNotice([route]).en, /No verified journey time/);
  }
  assert.equal(hasJourneyEstimate({ configured: false, totalTime: 25 }), false);
  assert.equal(hasJourneyEstimate({ configured: "true", totalTime: 25 }), false);
  assert.equal(hasJourneyEstimate({ configured: true, totalTime: 25 }), true);
});

test("route notices count only confirmed estimates, excluding previews and missing times", () => {
  const routes = [
    { configured: true, totalTime: 25 }, { configured: false, totalTime: 10 },
    { configured: true, totalTime: 0 }, { configured: false, totalTime: 0 },
  ];
  const notice = routeResultNotice(routes);
  assert.match(notice.ko, /경로 1개/);
  assert.match(notice.en, /Compare 1 route with/);
  assert.match(notice.en, /does not confirm wheelchair access/);
  assert.doesNotMatch(notice.ko, /실제 교통 경로/);
  for (const alternatives of [[], routes.slice(1)]) {
    assert.match(routeResultNotice(alternatives).en, /No verified journey time/);
    assert.match(routeResultNotice(alternatives).ko, /직선 연결은 실제 이동 경로가 아닙니다/);
  }
});

test("English names translate app-authored route titles while preserving arbitrary provider text", () => {
  const kakao = { id: "kakao-car", label: "카카오 자동차 추천" };
  assert.equal(routeTitle(kakao, false), kakao.label);
  assert.equal(routeTitle(kakao, true), "Kakao recommended driving route");
  assert.equal(routeTitle({ id: "odsay-2", label: "대중교통 2안" }, true), "Public transport option 2");
  for (const label of ["경남 58번 버스", "Custom provider description", "<script>alert(1)</script>"]) {
    assert.equal(routeTitle({ id: "odsay-2", label }, true), label);
  }
});
