export type LandingFeature = {
  id: string;
  title: string;
  body: string;
  icon: string;
  href?: string;
};

// Add an item only after its real route and behavior have been checked again.
export const landingFeatures: readonly LandingFeature[] = [
  { id: "facilities", title: "편의로 찾기", body: "내게 필요한 시설", icon: "M4 6h16M7 12h10M10 18h4", href: "/planner#conditions" },
  { id: "evidence", title: "편의 확인", body: "확인·미확인 한눈에", icon: "M5 12l4 4L19 6M5 20h14", href: "/planner" },
  { id: "naru", title: "나루와 계획", body: "제안 적용·되돌리기", icon: "M4 5h16v11H9l-5 4V5Z", href: "/guide#naru-guide" },
  { id: "weather", title: "출발 준비", body: "날씨·운영시간 확인", icon: "M7 17a4 4 0 1 1 1-7.9A5 5 0 0 1 18 12h1a3 3 0 0 1 0 6H7", href: "/planner" },
  { id: "route", title: "경로 비교", body: "이동시간 한눈에", icon: "M6 19V5l6-2 6 2v14l-6 2-6-2Z", href: "/planner" },
  { id: "save", title: "여행 저장", body: "다음에도 이어서", icon: "M5 4h14v16H5V4Zm3 0v6h8V4", href: "/travel-book" },
  { id: "day", title: "당일 안내", body: "순서 확인·방문 표시", icon: "M5 4h14v16H5V4Zm3 5h8M8 13h5", href: "/guide#day-guide" },
  { id: "festival", title: "축제 찾기", body: "일정에 축제 더하기", icon: "M6 3v3m12-3v3M4 8h16v12H4V8Zm4 4h3m2 0h3", href: "/festivals" },
];
