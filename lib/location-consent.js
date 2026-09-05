/** Inform before requesting device permission; no coordinates are read here. */
export function confirmMapLocationUse() {
  if (typeof window === "undefined") return false;
  const english = document.documentElement.lang === "en";
  return window.confirm(english
    ? "Show your current location? W.A.V.E will not send it to its route API or save it. The map provider may receive the viewed area and your IP; nearby searches send the map centre to Kakao. You can choose a public departure point instead. Continue?"
    : "현재 위치를 표시할까요? W.A.V.E 경로 API로 좌표를 보내거나 저장하지 않습니다. 다만 지도 제공처에 화면 영역과 접속 IP가, 주변 검색을 사용하면 카카오에 지도 중심 좌표가 전달될 수 있습니다. 공개 출발 거점을 직접 선택해도 이용할 수 있습니다. 계속할까요?");
}
