export const COMMUNITY_CATEGORIES = ["general", "place", "review"];
export const COMMUNITY_REGIONS = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];

export function cleanCommunityText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
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
