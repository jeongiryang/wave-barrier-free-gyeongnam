import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessUserTypeImpacts,
  combineOfficialAndFieldEvidence,
  FIELD_USER_TYPES,
  normalizeVisionAnalysis,
} from "../lib/accessibility-vision.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const stairsPhoto = {
  image_quality: "usable",
  scene_description: "관광지 입구",
  accessibility_elements: [
    { type: "stairs", detected: true, severity: "high", confidence: 0.91, description: "출입구 앞에 계단이 확인됨" },
    { type: "ramp", detected: false, severity: "unknown", confidence: 0.82, description: "사진상 경사로가 확인되지 않음" },
  ],
  mobility_obstacles: [{ type: "step", description: "입구에 단차가 있어 보임" }],
  overall_confidence: 0.87,
};

test("a usable photo keeps only known element types and reports what was seen", () => {
  const analysis = normalizeVisionAnalysis(
    { ...stairsPhoto, accessibility_elements: [...stairsPhoto.accessibility_elements, { type: "wifi_router", detected: true, confidence: 0.99 }] },
    { model: "gemini-test" },
  );
  assert.equal(analysis.usable, true);
  assert.equal(analysis.source, "vlm_analysis");
  assert.deepEqual(analysis.elements.map((element) => element.type), ["stairs", "ramp"]);
  assert.equal(analysis.elements[0].state, "detected");
  assert.equal(analysis.elements[1].state, "not_visible");
});

test("an element the photo does not show is never reported as absent", () => {
  const analysis = normalizeVisionAnalysis(stairsPhoto);
  const ramp = analysis.elements.find((element) => element.type === "ramp");
  assert.equal(ramp.detected, false);
  assert.equal(ramp.state, "not_visible");
  assert.equal(ramp.severity, "unknown");
});

test("detection without a usable confidence stays unconfirmed", () => {
  const analysis = normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [{ type: "elevator", detected: true, severity: "high", description: "확신 없이 단정한 응답" }],
  });
  assert.equal(analysis.elements[0].detected, false);
  assert.equal(analysis.elements[0].confidence, null);
});

test("measurements are never invented even when the model supplies numbers", () => {
  const analysis = normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [{ type: "step", detected: true, confidence: 0.7 }],
    mobility_obstacles: [{ type: "step", measurement: "12cm", estimated: false, description: "단차" }],
  });
  assert.equal(analysis.obstacles[0].measurement, null);
  assert.equal(analysis.obstacles[0].estimated, true);
  assert.match(analysis.obstacles[0].measurementNote, /측정할 수 없습니다/);
});

test("confidence outside the valid range is clamped instead of trusted", () => {
  const analysis = normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [
      { type: "stairs", detected: true, confidence: 4.5 },
      { type: "obstacle", detected: true, confidence: -2 },
    ],
  });
  assert.equal(analysis.elements[0].confidence, 1);
  assert.equal(analysis.elements[1].confidence, 0);
});

test("a single photo never settles official accessibility", () => {
  const analysis = normalizeVisionAnalysis(stairsPhoto);
  assert.equal(analysis.requiresHumanVerification, true);
  const confident = normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [{ type: "ramp", detected: true, severity: "low", confidence: 1 }],
    overall_confidence: 1,
  });
  assert.equal(confident.requiresHumanVerification, true);
});

for (const [quality, pattern] of [["too_dark", /어둡습니다/], ["too_blurry", /흐려/], ["unrelated", /사진이 아닙니다/]]) {
  test(`a ${quality} photo asks for another shot instead of guessing`, () => {
    const analysis = normalizeVisionAnalysis({
      image_quality: quality,
      accessibility_elements: [{ type: "stairs", detected: true, confidence: 0.9 }],
    });
    assert.equal(analysis.usable, false);
    assert.deepEqual(analysis.elements, []);
    assert.match(analysis.retakeGuidance, pattern);
  });
}

test("a malformed or empty model response degrades to unknown rather than throwing", () => {
  for (const raw of [null, "문자열 응답", [], { unexpected: true }]) {
    const analysis = normalizeVisionAnalysis(raw);
    assert.equal(analysis.usable, false);
    assert.deepEqual(analysis.elements, []);
    assert.equal(analysis.requiresHumanVerification, true);
    assert.ok(analysis.retakeGuidance.length > 0);
  }
});

test("stairs raise wheelchair risk while leaving unrelated conditions unknown", () => {
  const impacts = assessUserTypeImpacts(normalizeVisionAnalysis(stairsPhoto).elements);
  assert.equal(impacts.wheel.level, "high_risk");
  assert.equal(impacts.wheel.label, "주의 필요");
  assert.equal(impacts.senior.level, "caution");
  assert.equal(impacts.hearing.level, "unknown");
  assert.deepEqual(Object.keys(impacts), FIELD_USER_TYPES);
});

test("a low severity barrier is reported as caution rather than risk", () => {
  const impacts = assessUserTypeImpacts(normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [{ type: "narrow_passage", detected: true, severity: "low", confidence: 0.6 }],
  }).elements);
  assert.equal(impacts.wheel.level, "caution");
});

test("a braille block informs the visual condition only", () => {
  const impacts = assessUserTypeImpacts(normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [{ type: "braille_block", detected: true, severity: "low", confidence: 0.8 }],
  }).elements);
  assert.equal(impacts.visual.level, "clear");
  assert.equal(impacts.visual.label, "방해 요소 미발견");
  assert.equal(impacts.wheel.level, "unknown");
});

test("a ramp in the same photo does not cancel a detected barrier", () => {
  const impacts = assessUserTypeImpacts(normalizeVisionAnalysis({
    image_quality: "usable",
    accessibility_elements: [
      { type: "stairs", detected: true, severity: "high", confidence: 0.9 },
      { type: "ramp", detected: true, severity: "low", confidence: 0.9 },
    ],
  }).elements);
  assert.equal(impacts.wheel.level, "high_risk");
});

test("official data survives a conflicting field reading", () => {
  const place = {
    name: "테스트 관광지",
    source: "무장애 여행정보 · 국문 관광정보",
    features: ["휠체어", "접근로"],
    details: ["휠체어: 대여 가능", "접근로: 완만함"],
    knownFields: 2,
    unknownFields: 3,
  };
  const combined = combineOfficialAndFieldEvidence(place, normalizeVisionAnalysis(stairsPhoto), ["wheel"]);
  assert.equal(combined.official.source, "official_api");
  assert.deepEqual(combined.official.features, ["휠체어", "접근로"]);
  assert.deepEqual(combined.official.details, place.details);
  assert.equal(combined.field.source, "vlm_analysis");
  assert.equal(combined.conflicts.length, 1);
  assert.match(combined.conflicts[0].message, /공식 정보에는/);
  assert.match(combined.conflicts[0].message, /확인이 필요합니다/);
  assert.equal(combined.guidance[0].profile, "wheel");
});

test("an unusable photo produces no conflict claims against official data", () => {
  const combined = combineOfficialAndFieldEvidence(
    { name: "테스트", features: ["휠체어"], details: [] },
    normalizeVisionAnalysis({ image_quality: "too_dark" }),
    ["wheel"],
  );
  assert.deepEqual(combined.conflicts, []);
  assert.deepEqual(combined.guidance, []);
  assert.deepEqual(combined.official.features, ["휠체어"]);
});

test("field scanning keeps the Gemini key server-side and strips photo location data", async () => {
  const [env, handler, gemini, worker, preparePhoto, hook, scanner, envExample] = await Promise.all([
    source("server/shared/env.ts"),
    source("server/accessibility/handler.ts"),
    source("server/accessibility/gemini.ts"),
    source("worker/index.ts"),
    source("features/accessibility/prepare-photo.ts"),
    source("features/accessibility/hooks/useFieldAccessibilityScan.ts"),
    source("features/accessibility/components/FieldAccessibilityScanner.tsx"),
    source(".env.example"),
  ]);

  // 키는 서버 환경 변수에서만 읽고 클라이언트 모듈에는 이름조차 등장하지 않는다.
  assert.match(env, /GEMINI_API_KEY\?: string/);
  assert.match(env, /GEMINI_MODEL\?: string/);
  assert.match(envExample, /GEMINI_API_KEY=\s*$/m);
  assert.match(envExample, /GEMINI_MODEL=/);
  for (const clientModule of [preparePhoto, hook, scanner]) {
    assert.doesNotMatch(clientModule, /GEMINI_API_KEY|x-goog-api-key|generativelanguage/);
  }
  assert.match(gemini, /x-goog-api-key/);
  assert.match(gemini, /AbortSignal\.timeout\(/);
  assert.doesNotMatch(gemini, /console\.(log|error|warn)/);
  assert.doesNotMatch(handler, /console\.(log|error|warn)/);

  // 모델명은 환경 변수로 분리하고 코드 전체에 흩뿌리지 않는다.
  assert.match(handler, /env\.GEMINI_MODEL/);
  assert.match(worker, /\/api\/accessibility\/scan/);

  // 사진은 캔버스로 다시 그려 EXIF(GPS)를 제거한 뒤에만 업로드한다.
  assert.match(preparePhoto, /canvas/);
  assert.match(preparePhoto, /toDataURL/);
  assert.match(hook, /preparePhotoForScan/);
  assert.doesNotMatch(hook, /getCurrentPosition|coords|latitude|longitude/);
  assert.doesNotMatch(scanner, /getCurrentPosition|coords|latitude|longitude/);
});

test("stored scans keep service judgements without official responses or photo bytes", async () => {
  const store = await source("server/accessibility/scan-store.ts");
  assert.match(store, /CREATE TABLE IF NOT EXISTS accessibility_scan/);
  assert.match(store, /image_digest/);
  assert.match(store, /verification_status TEXT NOT NULL DEFAULT 'pending'/);
  // 사진 원본과 한국관광공사 응답은 저장 대상이 아니다.
  assert.doesNotMatch(store, /image_base64|photo_data|raw_response|tour_api/);
});

test("the scan endpoint validates method, size and image format before calling the model", async () => {
  const handler = await source("server/accessibility/handler.ts");
  assert.match(handler, /POST 요청만 지원합니다/);
  assert.match(handler, /readTrustedJson\(request, MAX_SCAN_BYTES\)/);
  assert.match(handler, /ALLOWED_MIME/);
  assert.match(handler, /413/);
  assert.match(handler, /415/);
  assert.match(handler, /503/);
});
