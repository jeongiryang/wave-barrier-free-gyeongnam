export const regionCodes: Record<string, { legal: string[]; full: string[] }> = {
  "경남 전체": { legal: [], full: [] },
  "창원": { legal: ["121", "123", "125", "127", "129"], full: ["48121", "48123", "48125", "48127", "48129"] },
  "진주": { legal: ["170"], full: ["48170"] },
  "통영": { legal: ["220"], full: ["48220"] },
  "사천": { legal: ["240"], full: ["48240"] },
  "김해": { legal: ["250"], full: ["48250"] },
  "밀양": { legal: ["270"], full: ["48270"] },
  "거제": { legal: ["310"], full: ["48310"] },
  "양산": { legal: ["330"], full: ["48330"] },
  "의령": { legal: ["720"], full: ["48720"] },
  "함안": { legal: ["730"], full: ["48730"] },
  "창녕": { legal: ["740"], full: ["48740"] },
  "고성": { legal: ["820"], full: ["48820"] },
  "남해": { legal: ["840"], full: ["48840"] },
  "하동": { legal: ["850"], full: ["48850"] },
  "산청": { legal: ["860"], full: ["48860"] },
  "함양": { legal: ["870"], full: ["48870"] },
  "거창": { legal: ["880"], full: ["48880"] },
  "합천": { legal: ["890"], full: ["48890"] },
};
export const regionPhotoKeywords: Record<string, string> = {
  창원: "진해 군항제", 진주: "진주 남강", 통영: "통영 한려수도", 사천: "사천 바다",
  김해: "김해 가야", 밀양: "밀양 영남루", 거제: "거제 바람의 언덕", 양산: "양산 통도사",
  의령: "의령", 함안: "함안 낙화놀이", 창녕: "창녕 우포늪", 고성: "고성 공룡",
  남해: "남해 다랭이마을", 하동: "하동 야생차", 산청: "산청 동의보감촌", 함양: "함양 지리산",
  거창: "거창 수승대", 합천: "합천 황매산",
};

export const regionPhotoFallbackKeywords: Record<string, string[]> = {
  남해: ["남해 다랭이마을", "남해 관광"],
  산청: ["산청 동의보감촌", "산청 황매산", "산청 관광"],
};

export const contentTypes: Record<string, string> = {
  nature: "12",
  history: "14",
  leisure: "28",
  food: "39",
};

export const languageServices: Record<string, { service: string; name: string; source: string; audio: string }> = {
  ko: { service: "KorService2", name: "국문 관광정보", source: "한국어", audio: "ko" },
  en: { service: "EngService2", name: "영문 관광정보", source: "English", audio: "en" },
  ja: { service: "JpnService2", name: "일문 관광정보", source: "日本語", audio: "ja" },
  "zh-Hans": { service: "ChsService2", name: "중문 간체 관광정보", source: "简体中文", audio: "zh" },
  "zh-Hant": { service: "ChtService2", name: "중문 번체 관광정보", source: "繁體中文", audio: "zh" },
  fr: { service: "FreService2", name: "불문 관광정보", source: "Français", audio: "en" },
  de: { service: "GerService2", name: "독문 관광정보", source: "Deutsch", audio: "en" },
  ru: { service: "RusService2", name: "노어 관광정보", source: "Русский", audio: "ru" },
};

export const profileFields: Record<string, Array<[string, string]>> = {
  wheel: [["parking", "장애인 주차"], ["route", "접근로"], ["wheelchair", "휠체어"], ["elevator", "엘리베이터"], ["restroom", "장애인 화장실"]],
  senior: [["route", "완만한 접근로"], ["elevator", "엘리베이터"], ["restroom", "화장실"]],
  baby: [["stroller", "유모차"], ["lactationroom", "수유실"], ["babysparechair", "유아용 의자"]],
  pregnant: [["elevator", "엘리베이터"], ["restroom", "화장실"], ["route", "접근로"]],
  visual: [["braileblock", "점자블록"], ["helpdog", "안내견"], ["guidehuman", "안내요원"], ["audioguide", "음성안내"], ["bigprint", "큰활자 안내"]],
  hearing: [["signguide", "수어안내"], ["videoguide", "영상안내"], ["hearingroom", "청각지원 객실"]],
};
