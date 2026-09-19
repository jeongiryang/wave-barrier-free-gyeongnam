// 도움 요청 화면에서 쓰는 순수 문구 모듈이다.
// 네트워크, 브라우저 저장소, 위치 측정 API를 참조하지 않는다.
// 상태는 호출자(React 컴포넌트)가 메모리에서만 관리한다.

const MAX_MESSAGE_LENGTH = 200;
const MAX_PLACE_NAME_LENGTH = 120;

const SITUATIONS = [
  { id: "body", label: "몸이 불편해요" },
  { id: "lost", label: "길을 못 찾겠어요" },
  { id: "equipment", label: "기기가 고장 났어요" },
  { id: "companion", label: "도움을 청할 사람이 필요해요" },
];

const SITUATION_SENTENCES = {
  body: "몸이 불편해서 도움이 필요합니다.",
  lost: "길을 찾기 어려워서 도움이 필요합니다.",
  equipment: "사용하던 기기가 고장 나서 도움이 필요합니다.",
  companion: "곁에서 함께해 줄 사람이 필요합니다.",
};

const DEFAULT_SENTENCE = "도움이 필요합니다.";

export function helpSituations() {
  return SITUATIONS.map((item) => ({ ...item }));
}

function normalizePlaceName(placeName) {
  const trimmed = typeof placeName === "string" ? placeName.trim() : "";
  return trimmed.slice(0, MAX_PLACE_NAME_LENGTH);
}

export function helpMessage(situation, placeName) {
  const sentence = SITUATION_SENTENCES[situation] || DEFAULT_SENTENCE;
  const place = normalizePlaceName(placeName);
  const message = place ? `${sentence} 지금 있는 곳은 ${place}입니다.` : sentence;
  return message.slice(0, MAX_MESSAGE_LENGTH);
}
