/**
 * 입력 오류가 어느 칸의 것인지 화면에 연결한다.
 *
 * 안내 문구는 폼 아래 한 곳에만 떴고, 어느 칸이 문제인지는 어디에도 표시되지
 * 않았다. 눈으로 보는 사람은 문구를 읽고 위로 되짚어 올라가야 했고, 화면 낭독기를
 * 쓰는 사람은 문구만 듣고 어느 칸으로 가야 할지 알 수 없었다.
 */

/** 검사 결과의 필드 이름 → 실제 입력 요소 id. */
const FIELD_INPUT_ID = {
  name: "auth-name",
  email: "auth-email",
  password: "auth-password",
  confirmPassword: "auth-confirm-password",
};

/**
 * @param {string | undefined | null} field
 * @returns {string | null}
 */
export function authFieldInputId(field) {
  if (!field) return null;
  return Object.prototype.hasOwnProperty.call(FIELD_INPUT_ID, field)
    ? FIELD_INPUT_ID[/** @type {keyof typeof FIELD_INPUT_ID} */ (field)]
    : null;
}

/** 화면이 다루는 입력 칸 이름 전체. 검사 쪽이 새 필드를 늘리면 여기도 늘어야 한다. */
export const AUTH_FIELDS = Object.keys(FIELD_INPUT_ID);
