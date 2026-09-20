// 출발 전 확인 영역에 표시하는 정적 대비 목록이다. 위험을 계산하거나
// 사용자 상태를 수집하지 않으며, 이미 있는 WAVE 화면으로만 연결한다.
export const TRIP_PRECAUTION_ITEMS = Object.freeze([
  { id: "precaution-weather", label: "그날 날씨를 확인하고 실내 대안을 준비했나요?", href: "#layers", actionLabel: "날씨 확인" },
  { id: "precaution-transport", label: "이동 수단의 편의시설을 미리 확인했나요?", href: "#navigation", actionLabel: "이동 화면 확인" },
  { id: "precaution-equipment", label: "보조기기가 고장 났을 때 연락할 곳을 알고 있나요?", href: "#equipment-rental", actionLabel: "대여처 확인" },
  { id: "precaution-contact", label: "급할 때 연락할 곳을 저장해 두었나요?", href: "#more-trip-tools", actionLabel: "도움 요청 확인" },
]);

export function tripPrecautionItems() {
  return TRIP_PRECAUTION_ITEMS;
}
