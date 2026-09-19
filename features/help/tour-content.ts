export type TourStep = {
  selector: string;
  highlightSelector: string;
  eyebrow: string;
  title: string;
  copy: string;
};

export const landingSteps: TourStep[] = [
  { selector: '#top', highlightSelector: '#top .landing-hero-copy', eyebrow: '서비스 소개', title: '경남 여행을 준비하는 곳이에요.', copy: '필요한 편의시설과 이동 정보를 확인하고 일정을 만들 수 있어요.' },
  { selector: '#regions', highlightSelector: '.simple-region-grid', eyebrow: '지역 선택', title: '여행할 지역을 고르세요.', copy: '사진을 누르면 그 지역의 여행지를 바로 찾아볼 수 있어요. 지역 더 보기로 경남 18개 시·군을 모두 볼 수 있어요.' },
  { selector: '#story', highlightSelector: '.horizon-chapter-stream', eyebrow: '일정 만들기', title: '날짜별로 장소를 담아보세요.', copy: '여행지 정보를 보고 담은 뒤 날짜와 시간을 정하세요. 일정과 지도는 함께 확인할 수 있어요.' },
  { selector: '#naru', highlightSelector: '#naru', eyebrow: '나루', title: '말이나 글로도 요청할 수 있어요.', copy: '나루에게 지역이나 장소를 말해보세요. 요청한 변경은 화면의 일정에도 반영되고 되돌릴 수 있어요.' },
];

export const plannerSteps: TourStep[] = [
  { selector: '#conditions', highlightSelector: '.simple-search-bar', eyebrow: '여행지 찾기', title: '지역부터 골라보세요.', copy: '지역을 고르면 장소가 나와요. 필요한 시설은 편의 버튼에서 골라 적용하고, 활동은 원할 때만 고르세요.' },
  { selector: '#places', highlightSelector: '.simple-place-row', eyebrow: '여행지 정보', title: '사진이나 이름을 누르면 자세히 볼 수 있어요.', copy: '담기를 누른 뒤에도 계속 둘러볼 수 있어요. 필요한 시설이 확인되지 않은 후보는 따로 표시해요.' },
  { selector: '#itinerary', highlightSelector: '.simple-stops > li, .simple-empty, .simple-itinerary-map', eyebrow: '내 일정', title: '방문할 날짜와 시간을 정하세요.', copy: '수정 버튼에서 머무는 시간과 날짜를 바꿀 수 있어요. 내 여행에 저장하거나 공유 버튼으로 링크를 보낼 수 있어요.' },
  { selector: '#departure-readiness', highlightSelector: '#departure-readiness > summary', eyebrow: '출발 전 확인', title: '방문 정보를 확인하세요.', copy: '날씨와 운영시간, 이동과 편의시설 정보는 필요한 항목을 펼쳐서 확인하세요.' },
];

export const communitySteps: TourStep[] = [
  { selector: ".community-page", highlightSelector: ".community-hero", eyebrow: "여행 후기", title: "여행자의 현장 경험을 살펴보세요.", copy: "공식 관광정보와 여행자가 직접 남긴 경험을 구분해 읽을 수 있습니다." },
  { selector: "#community-list", highlightSelector: "#community-list", eyebrow: "후기 목록", title: "필요한 여행 경험을 찾아봅니다.", copy: "장소와 편의조건으로 후기를 찾고, 여행자 경험과 공식 관광정보를 구분해 확인할 수 있습니다." },
  { selector: ".community-evidence-note", highlightSelector: ".community-evidence-note", eyebrow: "정보 원칙", title: "후기는 공식 정보의 대체물이 아닙니다.", copy: "방문 전에는 운영기관의 최신 편의시설 정보를 다시 확인해 주세요." },
];

export const travelBookSteps: TourStep[] = [
  { selector: ".travel-book-page", highlightSelector: ".travel-book-hero", eyebrow: "내 여행집", title: "갈 여행과 다녀온 여행을 모아 보세요.", copy: "플래너에서 만든 일정을 보관하고 언제든 다시 열어 여행을 준비하세요." },
  { selector: ".travel-book-paths", highlightSelector: ".travel-book-paths", eyebrow: "여행 기록", title: "기기를 바꿔도 여행을 이어가세요.", copy: "원하는 여행의 계정에 저장을 누른 뒤 계정 여행 보기로 이동하세요. 다른 기기에서도 같은 계정으로 로그인해 날짜·순서·메모를 편집하고 동행자를 초대할 수 있습니다." },
  { selector: ".travel-book-list, .travel-book-empty", highlightSelector: ".travel-book-list, .travel-book-empty", eyebrow: "여행 관리", title: "일정을 열고 여행 상태를 관리하세요.", copy: "여행을 복원하고, 다녀온 여행으로 바꾸거나 현장 메모를 이어서 정리할 수 있습니다." },
];

const englishTourCopy: Record<string, Pick<TourStep, "eyebrow" | "title" | "copy">> = {
  "#top": { eyebrow: "About WAVE", title: "Get to know WAVE.", copy: "Connect your access needs with Gyeongnam tourism information, from choosing places to planning travel." },
  "#story": { eyebrow: "How to plan", title: "Scroll from preferences to your itinerary.", copy: "Choose a region and activities, check facilities and official information, then arrange your days. Start in the planner." },
  "#regions": { eyebrow: "Explore Gyeongnam", title: "Explore Gyeongnam's 18 regions.", copy: "Choose a photograph to browse places in that region. Expand the grid to see all 18 regions. Start a trip from the region you like." },
  "#naru": { eyebrow: "Travel together", title: "Save your trip and plan with companions.", copy: "Restore account trips and facility preferences across devices. The guide explains KakaoTalk sharing, sending to yourself, companion invitations, votes and comments." },
  "#unused-start": { eyebrow: "Start your trip", title: "Plan a trip that works for you.", copy: "Open the planner to choose a region, required facilities, activities and dates." },
  "#conditions": { eyebrow: "Find places", title: "Choose your trip preferences.", copy: "Choose a region to see places. Facilities and activities are optional. The conditions bar lets you edit each choice." },
  "#places": { eyebrow: "Places", title: "Check the evidence and add places.", copy: "Compare official facility information with details that still need checking. Use Places and Itinerary to switch between your results and saved day." },
  "#itinerary": { eyebrow: "My itinerary", title: "Set the dates and order of your places.", copy: "Change the order and compare actual travel routes with estimated times. Review every travel leg." },
  "#departure-readiness": { eyebrow: "Before departure", title: "Recheck information and save your trip.", copy: "Review weather, crowds, transport and facility information that needs checking, then share or export your itinerary." },
  ".community-page": { eyebrow: "Travel stories", title: "Read travellers' experiences.", copy: "Read personal experiences separately from official tourism information." },
  "#community-list": { eyebrow: "Find stories", title: "Find experiences that help you plan.", copy: "Find stories by place and facility needs, keeping traveller experiences separate from official evidence." },
  ".community-evidence-note": { eyebrow: "Using information", title: "Stories do not replace official information.", copy: "Recheck the latest facility information with the place operator before visiting." },
  ".travel-book-page": { eyebrow: "Saved trips", title: "Keep upcoming and past trips together.", copy: "Save planner itineraries and reopen them to prepare for your next trip." },
  ".travel-book-paths": { eyebrow: "Travel memories", title: "Continue the journey after your trip.", copy: "Add notes and restore your photo course for your next journey." },
  ".travel-book-list, .travel-book-empty": { eyebrow: "Manage trips", title: "Reopen and update your trips.", copy: "Restore an itinerary, mark a trip as visited or continue adding travel notes." },
};

export function localizeTourStep(step: TourStep, locale: string): TourStep {
  return locale === "en" ? { ...step, ...englishTourCopy[step.selector] } : step;
}
