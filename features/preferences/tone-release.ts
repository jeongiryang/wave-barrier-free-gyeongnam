/** 명세 28의 품질 기준: 사투리 응답은 대표 요청 20건 이상을 두 말투로 실행해
 * 장소·시설·숫자·시간과 확인·미확인 구분이 같은지 확인한 뒤에만 제공한다.
 *
 * 그 측정을 아직 하지 못했으므로 `경남 말` 선택지를 일반 사용자에게 보이지 않는다.
 * 저장된 브라우저 값으로도 켤 수 없다. 개발 빌드에서는 회귀 검증을 위해 남겨 둔다.
 *
 * 측정을 마치고 기준을 만족하면 이 함수가 무조건 true를 돌려주도록 바꾸면 된다.
 * 기준에 못 미치면 이 파일을 그대로 두고 측정 결과만 갱신한다.
 */
export function dialectToneEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try { return window.localStorage.getItem("wave-dev-presentation") === "enabled"; }
  catch { return false; }
}
