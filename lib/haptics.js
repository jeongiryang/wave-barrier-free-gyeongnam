/** 짧은 확인 신호만 담당하는 진동 모듈.
 *
 * 진동으로 글자나 문장을 전달하지 않는다. 휴대폰 진동 모터는 한 곳에서만
 * 떨리므로 점자처럼 위치로 글자를 구분할 수 없고, 사용자가 새 부호 체계를
 * 배워야 한다. 그래서 신호는 두 종류뿐이다. 성공은 한 번, 실패는 두 번.
 *
 * 이 모듈은 네트워크, 브라우저 저장소, 위치 API를 참조하지 않는다.
 * `navigator.vibrate` 호출은 저장소 전체에서 이 파일 한 곳에서만 일어난다.
 */

/** 두 신호의 패턴. 총 진동 시간은 각각 40ms와 140ms로 200ms를 넘지 않는다. */
const patterns = {
  confirm: [40],
  alert: [40, 60, 40],
};

/** 진동은 보조 신호다. 미지원이면 조용히 넘어가고 기능은 그대로 동작한다. */
export function hapticsSupported() {
  try {
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  } catch {
    return false;
  }
}

export function hapticPattern(signal) {
  const pattern = patterns[signal];
  // 호출자가 배열을 바꿔도 정해진 패턴이 흔들리지 않도록 복사본을 준다.
  return pattern ? [...pattern] : [];
}

/** enabled 가 false 이거나 미지원이면 아무 것도 하지 않고 false 를 돌려준다. */
export function vibrate(signal, enabled) {
  if (!enabled) return false;
  const pattern = hapticPattern(signal);
  if (!pattern.length) return false;
  if (!hapticsSupported()) return false;
  try {
    // Vibration API는 새 호출이 직전 패턴을 대체한다. 신호가 겹쳐 울리지 않는다.
    navigator.vibrate(pattern);
    return true;
  } catch {
    // 브라우저 정책이나 기기 사정으로 실패해도 오류로 처리하지 않는다.
    return false;
  }
}
