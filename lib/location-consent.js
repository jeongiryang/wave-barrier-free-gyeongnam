/** GPS is never passed to a map SDK, external lookup, journey state or persistence. */
export function confirmMapLocationUse(locale = 'ko') {
  if (typeof window === 'undefined') return false;
  return window.confirm(locale === 'en'
    ? 'Check distance on this device? Your location is used once to calculate a straight-line distance to the selected public departure. It is not sent to WAVE, map providers or Naru, or saved. Maps and searches continue using the selected public place. Continue?'
    : '이 기기에서 거리를 확인할까요? 현재 위치는 선택한 공개 출발지까지의 직선거리를 한 번 계산하는 데만 사용합니다. WAVE 서버·지도 제공처·나루에 전송하거나 저장하지 않습니다. 지도와 검색은 직접 선택한 공개 장소를 기준으로 유지합니다. 계속할까요?');
}
