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
  { selector: "#top", highlightSelector: "#top h1", eyebrow: "여행 시작", title: "내 여행 만들기에서 바로 시작합니다.", copy: "서비스 이용 화면의 첫 영역에서 현재 데이터 상태를 보고 곧바로 여행 조건을 고를 수 있습니다." },
  { selector: "#planner", highlightSelector: "#planner .workspace-heading", eyebrow: "1단계 · 여행 조건", title: "내게 필요한 여행 조건을 고르세요.", copy: "출발지, 지역, 날짜, 관심사와 휠체어·영유아·시청각 지원 같은 편의를 선택합니다." },
  { selector: "#journey", highlightSelector: "#journey .planner-journey-heading", eyebrow: "2단계 · 통합 여행 설계", title: "추천과 하루 코스, 상황 정보를 한 흐름에서 봅니다.", copy: "추천 여행지를 고른 뒤 일정과 날씨·혼잡·주변 여행정보를 같은 계획 안에서 이어서 확인합니다." },
  { selector: "#places", highlightSelector: "#places .journey-subheading", eyebrow: "추천 여행지", title: "접근성과 적합도를 비교하세요.", copy: "추천 카드에서 공식 관광사진과 편의정보를 확인하고 장소를 여행 보관함에 담습니다." },
  { selector: "#route", highlightSelector: "#route .route-intro", eyebrow: "하루 동선", title: "선택한 장소를 하루 일정으로 잇습니다.", copy: "추천 순서와 체류·이동 구간을 검토하고 필요하면 계획을 다시 조정합니다." },
  { selector: "#layers", highlightSelector: "#layers .journey-subheading", eyebrow: "상황 정보", title: "날씨와 지역 흐름을 계획에 함께 반영하세요.", copy: "날씨, 관광 집중도와 주변 여행정보를 확인하고 필요할 때 대안을 적용합니다." },
  { selector: "#navigation", highlightSelector: "#navigation .workspace-heading", eyebrow: "3단계 · 길찾기", title: "도보·자전거·대중교통·자동차를 비교하세요.", copy: "실제 API가 제공하는 예상 시간은 짧은 순으로 보고, 제공되지 않는 수단은 카카오맵 길찾기로 이어서 확인합니다." },
];
