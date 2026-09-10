export type TourStep = {
  selector: string;
  highlightSelector: string;
  eyebrow: string;
  title: string;
  copy: string;
};

export const landingSteps: TourStep[] = [
  { selector: "#top", highlightSelector: "#top .landing-hero-copy", eyebrow: "서비스 소개", title: "W.A.V.E를 한눈에 살펴보세요.", copy: "여행자의 이동 조건과 경남 관광 데이터를 연결해 장소 선택부터 실제 이동까지 돕는 서비스입니다." },
  { selector: "#regions", highlightSelector: "#region-current", eyebrow: "지역 탐색", title: "경남 18개 지역의 이야기를 고르세요.", copy: "화살표로 지역을 넘기고 사진 선택 버튼으로 같은 지역의 다른 풍경을 살펴보세요. 마음에 드는 지역에서 여행을 시작할 수 있습니다." },
  { selector: "#story", highlightSelector: "#horizon-how-title", eyebrow: "여행 준비", title: "조건부터 일정까지, 스크롤로 살펴보세요.", copy: "지역과 활동을 고르고, 필요한 편의와 공식 정보를 확인한 뒤 날짜별 일정을 만드는 흐름입니다. 여행 계획하기에서 직접 시작할 수 있어요." },
  { selector: "#recommendation", highlightSelector: "#recommendation .horizon-account-copy", eyebrow: "함께 여행", title: "내 여행을 저장하고 동행자와 함께 준비하세요.", copy: "계정에 저장한 여행과 편의 조건을 다른 기기에서도 이어갈 수 있어요. 카카오톡 공유, 나에게 보내기, 동행 초대·투표·댓글은 사용법에서 확인하세요." },
  { selector: ".landing-cta", highlightSelector: ".landing-cta > h2", eyebrow: "여행 시작", title: "이제 내 여행을 설계해 보세요.", copy: "여행 만들기로 이동해 지역, 관심사, 필요한 편의와 출발지를 선택할 수 있습니다." },
];

export const plannerSteps: TourStep[] = [
  { selector: "#conditions", highlightSelector: "#conditions .condition-heading", eyebrow: "1단계 · 여행 조건", title: "내게 필요한 여행 조건을 고르세요.", copy: "지역·필요한 편의·활동·날짜를 고른 뒤 여행지 찾기를 누릅니다." },
  { selector: "#places", highlightSelector: "#places .place-content, #places .place-empty, #places .result-notice", eyebrow: "2단계 · 여행지", title: "추천 이유를 확인하고 일정에 추가하세요.", copy: "공식 정보에서 확인된 편의시설과 확인이 필요한 항목을 구분해 보여 줍니다." },
  { selector: "#itinerary", highlightSelector: "#itinerary .day-planner", eyebrow: "3단계 · 내 일정", title: "추가한 장소의 날짜와 순서를 정하세요.", copy: "추천 순서로 시작해 직접 순서를 바꾸고 실제 이동 경로와 예상 시간을 비교할 수 있습니다." },
  { selector: "#departure-readiness", highlightSelector: "#departure-readiness > header", eyebrow: "4단계 · 출발 전 확인", title: "최신 정보와 저장 방법을 확인하세요.", copy: "날씨, 혼잡, 교통과 편의시설 정보 중 다시 확인할 항목을 보고 일정 공유와 캘린더 저장을 마칩니다." },
];

export const communitySteps: TourStep[] = [
  { selector: ".community-page", highlightSelector: ".community-hero", eyebrow: "여행 후기", title: "여행자의 현장 경험을 살펴보세요.", copy: "공식 관광정보와 여행자가 직접 남긴 경험을 구분해 읽을 수 있습니다." },
  { selector: "#community-list", highlightSelector: "#community-list", eyebrow: "후기 목록", title: "필요한 여행 경험을 찾아봅니다.", copy: "장소와 편의조건으로 후기를 찾고, 여행자 경험과 공식 관광정보를 구분해 확인할 수 있습니다." },
  { selector: ".community-footer", highlightSelector: ".community-footer", eyebrow: "정보 원칙", title: "후기는 공식 정보의 대체물이 아닙니다.", copy: "방문 전에는 운영기관의 최신 편의시설 정보를 다시 확인해 주세요." },
];

export const travelBookSteps: TourStep[] = [
  { selector: ".travel-book-page", highlightSelector: ".travel-book-hero", eyebrow: "내 여행집", title: "갈 여행과 다녀온 여행을 모아 보세요.", copy: "플래너에서 만든 일정을 보관하고 언제든 다시 열어 여행을 준비하세요." },
  { selector: ".travel-book-privacy", highlightSelector: ".travel-book-privacy", eyebrow: "여행 기록", title: "기기를 바꿔도 여행을 이어가세요.", copy: "원하는 여행의 계정에 저장을 누른 뒤 계정 여행 보기로 이동하세요. 다른 기기에서도 같은 계정으로 로그인해 날짜·순서·메모를 편집하고 동행자를 초대할 수 있습니다." },
  { selector: ".travel-book-list, .travel-book-empty", highlightSelector: ".travel-book-list, .travel-book-empty", eyebrow: "여행 관리", title: "일정을 열고 여행 상태를 관리하세요.", copy: "여행을 복원하고, 다녀온 여행으로 바꾸거나 현장 메모를 이어서 정리할 수 있습니다." },
];

const englishTourCopy: Record<string, Pick<TourStep, "eyebrow" | "title" | "copy">> = {
  "#top": { eyebrow: "About W.A.V.E", title: "Get to know W.A.V.E.", copy: "Connect your access needs with Gyeongnam tourism information, from choosing places to planning travel." },
  "#story": { eyebrow: "How to plan", title: "Scroll from preferences to your itinerary.", copy: "Choose a region and activities, check facilities and official information, then arrange your days. Start in the planner." },
  "#regions": { eyebrow: "Explore Gyeongnam", title: "Explore Gyeongnam's 18 regions.", copy: "Use the arrows to browse regions and the photograph buttons to see more scenes from each region. Start a trip from the region you like." },
  "#recommendation": { eyebrow: "Travel together", title: "Save your trip and plan with companions.", copy: "Restore account trips and facility preferences across devices. The guide explains KakaoTalk sharing, sending to yourself, companion invitations, votes and comments." },
  ".landing-cta": { eyebrow: "Start your trip", title: "Plan a trip that works for you.", copy: "Open the planner to choose a region, required facilities, activities and dates." },
  "#conditions": { eyebrow: "Step 1 · Preferences", title: "Choose your trip preferences.", copy: "Choose a region, required facilities, activities and dates, then select Find places." },
  "#places": { eyebrow: "Step 2 · Places", title: "Check the evidence and add places.", copy: "Compare facilities supported by official information with details that still need checking." },
  "#itinerary": { eyebrow: "Step 3 · Itinerary", title: "Set the dates and order of your places.", copy: "Change the order and compare actual travel routes with estimated times. Review every travel leg." },
  "#departure-readiness": { eyebrow: "Step 4 · Before departure", title: "Recheck information and save your trip.", copy: "Review weather, crowds, transport and facility information that needs checking, then share or export your itinerary." },
  ".community-page": { eyebrow: "Travel stories", title: "Read travellers' experiences.", copy: "Read personal experiences separately from official tourism information." },
  "#community-list": { eyebrow: "Find stories", title: "Find experiences that help you plan.", copy: "Find stories by place and facility needs, keeping traveller experiences separate from official evidence." },
  ".community-footer": { eyebrow: "Using information", title: "Stories do not replace official information.", copy: "Recheck the latest facility information with the place operator before visiting." },
  ".travel-book-page": { eyebrow: "Saved trips", title: "Keep upcoming and past trips together.", copy: "Save planner itineraries and reopen them to prepare for your next trip." },
  ".travel-book-privacy": { eyebrow: "Travel memories", title: "Continue the journey after your trip.", copy: "Add notes and restore your photo course for your next journey." },
  ".travel-book-list, .travel-book-empty": { eyebrow: "Manage trips", title: "Reopen and update your trips.", copy: "Restore an itinerary, mark a trip as visited or continue adding travel notes." },
};

export function localizeTourStep(step: TourStep, locale: string): TourStep {
  return locale === "en" ? { ...step, ...englishTourCopy[step.selector] } : step;
}
