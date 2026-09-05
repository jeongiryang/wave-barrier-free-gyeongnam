/**
 * 요청한 편의조건 가운데 공식 데이터로 확인된 항목만으로 근거를 계산한다.
 * 사진 유무나 카드 순서처럼 접근성과 무관한 값은 점수에 섞지 않는다.
 */
export function calculateAccessibilityEvidence(matchedFields, knownFields, requestedFields) {
  const requested = Math.max(0, Math.trunc(Number(requestedFields) || 0));
  const known = Math.min(requested, Math.max(0, Math.trunc(Number(knownFields) || 0)));
  const matched = Math.min(known, Math.max(0, Math.trunc(Number(matchedFields) || 0)));
  const confidence = requested ? Math.round((known / requested) * 100) : 0;

  return {
    score: known ? Math.round((matched / requested) * 100) : null,
    confidence,
  };
}

/** Missing provider data is not evidence that a facility is absent. */
export function accessibilityFieldState(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || /^(?:-|미제공|정보\s*없음|확인\s*필요|해당\s*없음|미확인|알\s*수\s*없음)$/i.test(text)) return "unknown";
  if (/(없음|불가|미설치|지원\s*안)/.test(text)) return "negative";
  return "confirmed";
}

export function buildAccessibilityItems(fields, detail) {
  return [...new Map(fields).entries()].map(([key, label]) => ({
    key, label, state: accessibilityFieldState(detail[key]),
    detail: typeof detail[key] === "string" ? detail[key].trim().slice(0, 300) : "",
  }));
}
