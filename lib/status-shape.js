/**
 * 상태를 색이 아닌 단서로 옮기는 순수 함수.
 *
 * 색만으로 상태를 전달하지 않기 위해, 상태값마다 서로 다른 모양 이름과
 * 한국어 낱말을 돌려준다. React·CSS·DOM을 참조하지 않는다.
 */

const SHAPES = {
  confirmed: "check",
  unknown: "question",
  negative: "slash",
  ok: "dot",
  caution: "triangle",
  error: "cross",
};

const WORDS = {
  confirmed: "확인됨",
  unknown: "미확인",
  negative: "없음",
  ok: "확인",
  caution: "주의",
  error: "실패",
};

/** 알 수 없는 값이 들어와도 화면이 비지 않도록 기본 모양과 낱말을 둔다. */
const FALLBACK_SHAPE = "dot";
const FALLBACK_WORD = "안내";

export function statusShape(kind) {
  return SHAPES[kind] || FALLBACK_SHAPE;
}

export function statusWord(kind) {
  return WORDS[kind] || FALLBACK_WORD;
}
