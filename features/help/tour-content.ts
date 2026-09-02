export type TourStep = {
  selector: string;
  highlightSelector: string;
  eyebrow: string;
  title: string;
  copy: string;
};

export const landingSteps: TourStep[] = [
  { selector: "#top", highlightSelector: "#top .landing-hero-copy", eyebrow: "서비스 소개", title: "W.A.V.E를 한눈에 살펴보세요.", copy: "여행자의 이동 조건과 경남 관광 데이터를 연결해 장소 선택부터 실제 이동까지 돕는 서비스입니다." },
  { selector: "#story", highlightSelector: "#story > h2", eyebrow: "이용 원칙", title: "갈 수 있는지를 먼저 확인합니다.", copy: "사진만 보여 주지 않고 접근로·화장실·승강기와 이동 부담을 함께 비교합니다." },
  { selector: "#regions", highlightSelector: "#regions .region-story-copy", eyebrow: "지역 탐색", title: "경남 18개 지역의 이야기를 고르세요.", copy: "지도에서 지역을 선택하면 공식 관광사진과 지역별 여행 이야기를 확인할 수 있습니다." },
  { selector: "#evidence", highlightSelector: "#evidence > div:first-child", eyebrow: "추천 근거", title: "추천의 이유와 한계를 공개합니다.", copy: "관광·접근성·교통 데이터의 출처와 기준 시점을 나누어 보여 줍니다." },
  { selector: ".landing-cta", highlightSelector: ".landing-cta > h2", eyebrow: "여행 시작", title: "이제 내 여행을 설계해 보세요.", copy: "여행 만들기로 이동해 지역, 관심사, 필요한 편의와 출발지를 선택할 수 있습니다." },
];

export const plannerSteps: TourStep[] = [
  { selector: "#conditions", highlightSelector: "#conditions .journey-subheading", eyebrow: "1단계 · 여행 조건", title: "내게 필요한 여행 조건을 고르세요.", copy: "출발지, 지역, 날짜, 관심사와 필요한 편의시설을 선택합니다." },
  { selector: "#places", highlightSelector: "#places .journey-subheading", eyebrow: "2단계 · 여행지", title: "추천 이유를 확인하고 일정에 추가하세요.", copy: "공식 정보에서 확인된 편의시설과 확인이 필요한 항목을 구분해 보여 줍니다." },
  { selector: "#itinerary", highlightSelector: "#itinerary .journey-subheading", eyebrow: "3단계 · 이 기기 일정", title: "추가한 장소의 날짜와 순서를 정하세요.", copy: "추천 순서로 시작해 직접 순서를 바꾸고 실제 이동 경로와 예상 시간을 비교할 수 있습니다." },
  { selector: "#departure-readiness", highlightSelector: "#departure-readiness > header", eyebrow: "4단계 · 출발 전 확인", title: "최신 정보와 저장 방법을 확인하세요.", copy: "날씨, 혼잡, 교통과 편의시설 정보 중 다시 확인할 항목을 보고 일정 공유와 캘린더 저장을 마칩니다." },
];

export const communitySteps: TourStep[] = [
  { selector: ".community-page", highlightSelector: ".community-hero", eyebrow: "여행 후기", title: "여행자의 현장 경험을 살펴보세요.", copy: "공식 관광정보와 여행자가 직접 남긴 경험을 구분해 읽을 수 있습니다." },
  { selector: "#community-list", highlightSelector: "#community-list", eyebrow: "후기 목록", title: "실제 후기와 샘플을 구분합니다.", copy: "샘플 콘텐츠에는 배지를 표시하고, 장소와 편의조건으로 필요한 경험을 찾아볼 수 있습니다." },
  { selector: ".community-footer", highlightSelector: ".community-footer", eyebrow: "정보 원칙", title: "후기는 공식 정보의 대체물이 아닙니다.", copy: "방문 전에는 운영기관의 최신 편의시설 정보를 다시 확인해 주세요." },
];

export const travelBookSteps: TourStep[] = [
  { selector: ".travel-book-page", highlightSelector: ".travel-book-hero", eyebrow: "내 여행집", title: "갈 여행과 다녀온 여행을 모아 보세요.", copy: "플래너에서 만든 일정을 계정 없이 이 기기에 보관하고 다시 열 수 있습니다." },
  { selector: ".travel-book-privacy", highlightSelector: ".travel-book-privacy", eyebrow: "개인정보", title: "여행집은 이 브라우저에만 저장됩니다.", copy: "원본 사진, GPS, 정확한 출발지와 계정 정보는 저장하지 않습니다." },
  { selector: ".travel-book-list, .travel-book-empty", highlightSelector: ".travel-book-list, .travel-book-empty", eyebrow: "여행 관리", title: "일정을 열고 여행 상태를 관리하세요.", copy: "여행을 복원하고, 다녀온 여행으로 바꾸거나 현장 메모를 이어서 정리할 수 있습니다." },
];
