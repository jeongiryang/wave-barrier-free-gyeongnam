export type LandingFeature = {
  id: string;
  title: string;
  body: string;
  icon: string;
  href?: string;
};

// Add an item only after its real route and behavior have been checked again.
export const landingFeatures: readonly LandingFeature[] = [
  { id: "facilities", title: "필요한 편의를 고르고 그 조건으로 찾기", body: "공공데이터에 기록된 항목으로 찾아요. 기록이 부족한 장소는 미확인으로 남겨요.", icon: "M4 6h16M7 12h10M10 18h4", href: "/planner#conditions" },
  { id: "evidence", title: "확인된 정보와 모르는 정보 구분하기", body: "확인·미확인·명시적 부재를 나눠 보여 줘요. 시설의 현재 이용 가능 여부를 보장하지 않아요.", icon: "M5 12l4 4L19 6M5 20h14", href: "/planner" },
  { id: "naru", title: "나루와 대화하며 일정 만들기", body: "제안을 확인한 뒤 일정에 적용하고 되돌릴 수 있어요. 새 장소 제안은 직접 검토해야 해요.", icon: "M4 5h16v11H9l-5 4V5Z", href: "/guide#naru-guide" },
  { id: "weather", title: "날씨와 출발 준비 살펴보기", body: "제공처의 예보와 조회 시각을 보여 줘요. 당일 상황과 운영 여부는 다시 확인해야 해요.", icon: "M7 17a4 4 0 1 1 1-7.9A5 5 0 0 1 18 12h1a3 3 0 0 1 0 6H7", href: "/planner" },
  { id: "route", title: "지도에서 장소와 이동 방법 보기", body: "선택한 공개 장소 사이 경로와 예상 시간을 비교해요. 경로 조회가 접근 가능성을 뜻하지 않아요.", icon: "M6 19V5l6-2 6 2v14l-6 2-6-2Z", href: "/planner" },
  { id: "save", title: "여행을 저장하고 다시 열기", body: "이 기기나 계정에 일정을 보관해 이어서 만들어요. 기기 저장은 다른 기기로 자동 전송되지 않아요.", icon: "M5 4h14v16H5V4Zm3 0v6h8V4", href: "/travel-book" },
  { id: "day", title: "여행 당일 순서대로 따라가기", body: "방문 완료와 건너뛰기를 직접 표시해요. 현재 위치를 추적하거나 자동으로 방문을 판단하지 않아요.", icon: "M5 4h14v16H5V4Zm3 5h8M8 13h5", href: "/guide#day-guide" },
  { id: "festival", title: "경남 축제 찾아보기", body: "공식 관광 데이터의 행사 기간과 장소를 보여 줘요. 변경된 일정은 주최 측에서 다시 확인해야 해요.", icon: "M6 3v3m12-3v3M4 8h16v12H4V8Zm4 4h3m2 0h3", href: "/festivals" },
];
