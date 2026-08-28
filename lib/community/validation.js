export const COMMUNITY_CATEGORIES = ["general", "place", "review"];
export const COMMUNITY_REGIONS = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];

export function cleanCommunityText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

/**
 * 검색어를 ILIKE 패턴으로 감싼다.
 *
 * `%`와 `_`는 ILIKE의 와일드카드다. 그대로 넣으면 "진_시"가 진주시·진해시를 함께
 * 찾는 것처럼 사용자가 적지 않은 조건이 붙는다. `\`는 기본 이스케이프 문자라,
 * 검색어가 역슬래시로 끝나면 Postgres가 패턴 자체를 거부해 목록 요청이 실패한다.
 * 세 글자를 모두 문자 그대로 찾도록 앞에 역슬래시를 붙인다.
 *
 * @param {string} search
 * @returns {string}
 */
export function communitySearchPattern(search) {
  const literal = String(search ?? "").replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${literal}%`;
}

export function validatePostInput(input) {
  const title = cleanCommunityText(input?.title, 120);
  const content = cleanCommunityText(input?.content, 5000);
  const category = cleanCommunityText(input?.category, 20);
  const region = cleanCommunityText(input?.region, 20);
  const placeId = cleanCommunityText(input?.placeId, 100);
  const placeName = cleanCommunityText(input?.placeName, 120);
  if (!COMMUNITY_CATEGORIES.includes(category)) return { error: "게시판을 선택해 주세요." };
  if (title.length < 5) return { error: "제목은 5자 이상 입력해 주세요." };
  if (content.length < 10) return { error: "내용은 10자 이상 입력해 주세요." };
  if (region && !COMMUNITY_REGIONS.includes(region)) return { error: "경남 지역을 다시 선택해 주세요." };
  if (Boolean(placeId) !== Boolean(placeName)) return { error: "관광지 이름과 식별자를 함께 입력해 주세요." };
  return { value: { title, content, category, region: region || null, placeId: placeId || null, placeName: placeName || null } };
}

export function validateCommentInput(input) {
  const content = cleanCommunityText(input?.content, 1000);
  return content.length < 2 ? { error: "댓글은 2자 이상 입력해 주세요." } : { value: { content } };
}

export function communityListParams(url) {
  const category = cleanCommunityText(url.searchParams.get("category"), 20);
  const search = cleanCommunityText(url.searchParams.get("search"), 80);
  const placeId = cleanCommunityText(url.searchParams.get("placeId"), 100);
  const page = Math.max(1, Math.min(1000, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
  const limit = Math.max(1, Math.min(24, Number.parseInt(url.searchParams.get("limit") || "12", 10) || 12));
  return { category: COMMUNITY_CATEGORIES.includes(category) ? category : "", search, placeId, page, limit, offset: (page - 1) * limit };
}
