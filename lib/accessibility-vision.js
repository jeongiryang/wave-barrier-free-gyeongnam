/**
 * 현장 사진 판독 결과를 서비스가 신뢰할 수 있는 형태로 정규화한다.
 *
 * 이 모듈은 Gemini 응답을 그대로 믿지 않는다. 사진 한 장으로 확정할 수 없는
 * 것(공식 무장애 인증, 단차 높이, 보이지 않는 공간)은 모델이 무엇을 반환하든
 * 여기서 잘라낸다. 판독 결과는 한국관광공사 공식 데이터를 대체하지 않으며
 * 언제나 별도 출처로 표시된다.
 *
 * 순수 함수만 두어 API 키 없이 `node --test`로 검증할 수 있게 한다.
 */

/** 사진에서 확인을 시도하는 접근성 요소. 목록에 없는 유형은 버린다. */
export const FIELD_ELEMENT_TYPES = {
  stairs: { label: "계단", barrier: true },
  step: { label: "단차", barrier: true },
  threshold: { label: "문턱", barrier: true },
  steep_slope: { label: "급경사", barrier: true },
  narrow_passage: { label: "좁은 통로", barrier: true },
  obstacle: { label: "이동 장애물", barrier: true },
  ramp: { label: "경사로", barrier: false },
  elevator: { label: "엘리베이터", barrier: false },
  wheelchair_lift: { label: "휠체어 리프트", barrier: false },
  braille_block: { label: "점자블록", barrier: false },
  accessible_sign: { label: "장애인 안내 표지", barrier: false },
  handrail: { label: "손잡이", barrier: false },
  entrance: { label: "출입구", barrier: false },
  walkway: { label: "보행로 상태", barrier: false },
};

/** 화면에서 재사용하는 기존 접근성 조건 6종. 새 유형을 만들지 않는다. */
export const FIELD_USER_TYPES = ["wheel", "senior", "baby", "pregnant", "visual", "hearing"];

const IMPACT_ORDER = { unknown: 0, clear: 1, caution: 2, high_risk: 3 };

const IMPACT_LABELS = {
  high_risk: "주의 필요",
  caution: "확인 권장",
  clear: "방해 요소 미발견",
  unknown: "확인 필요",
};

const SEVERITY_LEVELS = ["low", "medium", "high", "unknown"];

const IMAGE_QUALITY_STATES = ["usable", "too_dark", "too_blurry", "unrelated", "unknown"];

const IMAGE_QUALITY_GUIDANCE = {
  too_dark: "사진이 너무 어둡습니다. 입구와 이동 경로가 잘 보이도록 다시 촬영해 주세요.",
  too_blurry: "사진이 흐려 접근성 요소를 확인하기 어렵습니다. 다시 촬영해 주세요.",
  unrelated: "현장 접근성을 확인할 수 있는 사진이 아닙니다. 입구 또는 이동 경로를 촬영해 주세요.",
  unknown: "사진 상태를 확인하지 못했습니다. 입구 또는 이동 경로가 보이도록 다시 촬영해 주세요.",
};

/**
 * 요소별로 어떤 이용자에게 영향을 주는지에 대한 고정 규칙.
 * 사진에 요소가 보였을 때만 적용하며, 보이지 않은 것은 근거로 쓰지 않는다.
 */
const ELEMENT_IMPACTS = {
  stairs: { wheel: "high_risk", senior: "caution", baby: "caution", pregnant: "caution", visual: "caution" },
  step: { wheel: "high_risk", senior: "caution", baby: "caution", pregnant: "caution", visual: "caution" },
  threshold: { wheel: "caution", senior: "caution", baby: "caution" },
  steep_slope: { wheel: "high_risk", senior: "caution", baby: "caution", pregnant: "caution" },
  narrow_passage: { wheel: "high_risk", baby: "caution" },
  obstacle: { wheel: "high_risk", visual: "high_risk", senior: "caution", baby: "caution" },
  ramp: { wheel: "clear", senior: "clear", baby: "clear", pregnant: "clear" },
  elevator: { wheel: "clear", senior: "clear", baby: "clear", pregnant: "clear" },
  wheelchair_lift: { wheel: "clear", senior: "clear" },
  braille_block: { visual: "clear" },
  accessible_sign: { visual: "clear", hearing: "clear" },
  handrail: { senior: "clear", pregnant: "clear" },
};

function clampConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(1, Math.max(0, Math.round(parsed * 100) / 100));
}

function text(value, max = 200) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** 심각도가 낮으면 위험 판정을 한 단계 낮춘다. 사진만으로 단정하지 않기 위해서다. */
function applySeverity(level, severity) {
  if (level !== "high_risk") return level;
  return severity === "high" ? "high_risk" : "caution";
}

function worst(current, next) {
  return IMPACT_ORDER[next] > IMPACT_ORDER[current] ? next : current;
}

/**
 * 사진에서 확인된 요소만으로 이용자 유형별 영향을 계산한다.
 * 근거가 없는 유형은 임의로 결론을 만들지 않고 unknown으로 남긴다.
 */
export function assessUserTypeImpacts(elements = []) {
  const impacts = {};
  for (const userType of FIELD_USER_TYPES) impacts[userType] = { level: "unknown", label: IMPACT_LABELS.unknown, reasons: [] };

  for (const element of elements) {
    if (!element?.detected) continue;
    const rules = ELEMENT_IMPACTS[element.type];
    if (!rules) continue;
    const meta = FIELD_ELEMENT_TYPES[element.type];
    for (const [userType, base] of Object.entries(rules)) {
      if (!impacts[userType]) continue;
      const level = applySeverity(base, element.severity);
      const previous = impacts[userType].level;
      impacts[userType].level = worst(previous, level);
      if (level !== "clear" || previous === "unknown") impacts[userType].reasons.push(meta.label);
    }
  }

  for (const userType of FIELD_USER_TYPES) {
    const entry = impacts[userType];
    entry.label = IMPACT_LABELS[entry.level];
    entry.reasons = [...new Set(entry.reasons)].slice(0, 3);
  }
  return impacts;
}

function normalizeElement(raw) {
  const type = text(raw?.type, 40);
  const meta = FIELD_ELEMENT_TYPES[type];
  if (!meta) return null;
  const confidence = clampConfidence(raw?.confidence);
  const severityValue = text(raw?.severity, 12);
  const severity = SEVERITY_LEVELS.includes(severityValue) ? severityValue : "unknown";
  // 모델이 detected를 참으로 주더라도 확신도가 없으면 확정하지 않는다.
  const detected = raw?.detected === true && confidence !== null;
  return {
    type,
    label: meta.label,
    barrier: meta.barrier,
    detected,
    // 사진에 보이지 않은 것은 "없음"이 아니라 "확인되지 않음"이다.
    state: detected ? "detected" : "not_visible",
    severity: detected ? severity : "unknown",
    confidence,
    description: text(raw?.description, 160),
  };
}

/**
 * 사진으로는 실측이 불가능하므로 모델이 숫자를 주더라도 저장하지 않는다.
 * 대신 "단차가 있어 보인다"는 정성적 관찰만 남긴다.
 */
function normalizeObstacle(raw) {
  const type = text(raw?.type, 40);
  if (!FIELD_ELEMENT_TYPES[type]) return null;
  return {
    type,
    label: FIELD_ELEMENT_TYPES[type].label,
    estimated: true,
    measurement: null,
    measurementNote: "사진으로는 정확한 높이·거리를 측정할 수 없습니다.",
    description: text(raw?.description, 160),
  };
}

/**
 * Gemini가 돌려준 구조를 검증해 화면에서 쓸 수 있는 형태로 바꾼다.
 * 사진 상태가 판독에 부적합하면 요소를 buildup하지 않고 재촬영을 안내한다.
 */
export function normalizeVisionAnalysis(raw, { model = "", analyzedAt = new Date().toISOString() } = {}) {
  const payload = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const qualityValue = text(payload.image_quality ?? payload.imageQuality, 16);
  const imageQuality = IMAGE_QUALITY_STATES.includes(qualityValue) ? qualityValue : "unknown";
  const usable = imageQuality === "usable";

  const elements = usable
    ? (Array.isArray(payload.accessibility_elements ?? payload.elements) ? (payload.accessibility_elements ?? payload.elements) : [])
        .map(normalizeElement)
        .filter(Boolean)
        .slice(0, 16)
    : [];

  const obstacles = usable
    ? (Array.isArray(payload.mobility_obstacles ?? payload.obstacles) ? (payload.mobility_obstacles ?? payload.obstacles) : [])
        .map(normalizeObstacle)
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const confidences = elements.map((element) => element.confidence).filter((value) => value !== null);
  const declared = clampConfidence(payload.overall_confidence ?? payload.overallConfidence);
  const overallConfidence = usable && confidences.length
    ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 100) / 100
    : usable ? declared : null;

  return {
    source: "vlm_analysis",
    model: text(model, 60),
    analyzedAt,
    imageQuality,
    // 사진 품질 문제는 사용자가 바로 고칠 수 있으므로 안내 문구를 함께 준다.
    retakeGuidance: usable ? "" : IMAGE_QUALITY_GUIDANCE[imageQuality] || IMAGE_QUALITY_GUIDANCE.unknown,
    sceneDescription: usable ? text(payload.scene_description ?? payload.sceneDescription, 200) : "",
    elements,
    obstacles,
    userTypeImpacts: assessUserTypeImpacts(elements),
    overallConfidence,
    // 사진 한 장은 공식 무장애 인증을 대신할 수 없다. 예외 없이 참이다.
    requiresHumanVerification: true,
    usable,
  };
}

/**
 * 공식 관광 데이터와 현장 판독을 나란히 둔다.
 * 공식 값은 어떤 경우에도 수정하거나 지우지 않고, 서로 어긋나면 그 사실만 알린다.
 */
export function combineOfficialAndFieldEvidence(place, analysis, selectedProfiles = []) {
  const official = {
    source: "official_api",
    name: place?.name || "",
    provider: place?.source || "",
    features: Array.isArray(place?.features) ? place.features : [],
    details: Array.isArray(place?.details) ? place.details : [],
    knownFields: Number(place?.knownFields || 0),
    unknownFields: Number(place?.unknownFields || 0),
  };

  if (!analysis?.usable) {
    return { official, field: analysis || null, conflicts: [], guidance: [] };
  }

  const barriers = analysis.elements.filter((element) => element.detected && element.barrier);
  const officialText = [...official.features, ...official.details].join(" ");
  const conflicts = barriers
    .filter(() => /휠체어|접근로|경사로/.test(officialText))
    .map((element) => ({
      element: element.type,
      label: element.label,
      // 공식 데이터를 부정하지 않는다. 두 정보가 다르다는 사실만 전달한다.
      message: `공식 정보에는 접근 편의가 기록되어 있지만 사진에서는 ${element.label}이(가) 확인됐습니다. 방문 전 확인이 필요합니다.`,
    }));

  const profiles = selectedProfiles.filter((profile) => FIELD_USER_TYPES.includes(profile));
  const targets = profiles.length ? profiles : FIELD_USER_TYPES;
  const guidance = targets
    .map((profile) => ({ profile, ...analysis.userTypeImpacts[profile] }))
    .filter((entry) => entry.level === "high_risk" || entry.level === "caution");

  return { official, field: analysis, conflicts, guidance };
}

export { IMPACT_LABELS, IMAGE_QUALITY_GUIDANCE };
