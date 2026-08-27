import type { Env } from "../shared/env";
import { clean, httpsUrl } from "../shared/http";
import { attemptProvider as attempt, commonParams, fetchTourismData as fetchKto } from "../shared/provider-data";
import { regionPhotoKeywords } from "./catalog";

function normalizedSearchText(value: unknown) {
  return clean(value, 120).toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function scoreSpotPhotoTitle(candidate: unknown, requestedTitle: string) {
  const candidateText = normalizedSearchText(candidate);
  const requestedText = normalizedSearchText(requestedTitle);
  if (!candidateText || !requestedText) return 0;
  if (candidateText === requestedText) return 120;
  if (candidateText.includes(requestedText) || requestedText.includes(candidateText)) return 90;
  const requestedTokens = clean(requestedTitle, 120)
    .split(/\s+/)
    .map(normalizedSearchText)
    .filter((token) => token.length >= 2);
  return requestedTokens.reduce((score, token) => score + (candidateText.includes(token) ? 12 : 0), 0);
}

export async function fetchSpotPhoto(env: Env, region: string, title: string, tag = "", contentId = "", strict = false) {
  const normalizedTitle = clean(title, 80)
    .replace(/\([^)]*\)|（[^）]*）/g, " ")
    .replace(/\b(주식회사|유한회사)\b|\(주\)|지점|본점/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const exactKeywords = [
    clean(title, 80),
    normalizedTitle,
    clean(`${region} ${normalizedTitle}`, 80),
  ];
  const fallbackKeywords = [
    clean(`${region} ${tag || "관광"}`, 80),
    clean(regionPhotoKeywords[region] || `${region} 관광`, 80),
  ];
  const keywords = [...new Set([
    ...exactKeywords,
    ...(strict ? [] : fallbackKeywords),
  ].filter((value) => value.length >= 2))].slice(0, 5);

  let providerWorked = false;
  if (/^\d{3,}$/.test(contentId)) {
    const detail = await attempt(fetchKto(env, "KorService2", "detailCommon2", {
      ...commonParams("1"), contentId,
    }));
    providerWorked ||= detail.ok;
    const item = detail.ok ? detail.value.items[0] : undefined;
    const image = httpsUrl(item?.firstimage || item?.firstimage2);
    // 기존 사진 호출은 contentId 상세에 이미지가 있을 때만 즉시 종료한다.
    // 이미지가 없으면 아래 검색에서 공공누리 사진 fallback을 계속 찾는다.
    if (image) {
      return {
        image,
        source: "한국관광공사 관광정보",
        matchedTitle: clean(item?.title || title),
        contentId: clean(item?.contentid || contentId, 40),
        address: clean([item?.addr1, item?.addr2].filter(Boolean).join(" "), 160),
        query: contentId,
        status: "live",
      };
    }
  }

  // 정확한 장소명부터 순차 검색해 공공데이터 초당 호출 제한을 피한다.
  for (const keyword of keywords) {
    const [gallery, tour] = await Promise.all([
      attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", { ...commonParams("12"), arrange: "C", keyword })),
      attempt(fetchKto(env, "KorService2", "searchKeyword2", { ...commonParams("12"), arrange: "Q", keyword })),
    ]);
    providerWorked ||= gallery.ok || tour.ok;
    const candidates = [
      ...(gallery.ok ? gallery.value.items.map((item) => ({
        image: httpsUrl(item.galWebImageUrl || item.galWebImageUrl2),
        title: clean(item.galTitle),
        source: "한국관광공사 관광사진",
        contentId: "",
        address: "",
      })) : []),
      ...(tour.ok ? tour.value.items.map((item) => ({
        image: httpsUrl(item.firstimage || item.firstimage2),
        title: clean(item.title),
        source: "한국관광공사 관광정보",
        contentId: clean(item.contentid, 40),
        address: clean([item.addr1, item.addr2].filter(Boolean).join(" "), 160),
      })) : []),
    ]
      .map((candidate) => ({
        ...candidate,
        titleScore: scoreSpotPhotoTitle(candidate.title, normalizedTitle),
      }))
      // 사진 코스는 사용자가 확인한 장소와 엄격히 일치할 때만 공식 카드로 보강한다.
      // 기존 추천 카드 호출은 예전처럼 지역 대표 사진 fallback을 유지한다.
      .filter((candidate) => (candidate.image || candidate.contentId) && (!strict || candidate.titleScore >= 90))
      .sort((left, right) => {
        const leftScore = left.titleScore + (left.contentId ? 40 : 0);
        const rightScore = right.titleScore + (right.contentId ? 40 : 0);
        return rightScore - leftScore;
      });

    const best = candidates[0];
    if (best) {
      const galleryFallback = candidates.find((candidate) => candidate.image && candidate.source === "한국관광공사 관광사진");
      return {
        image: best.image || galleryFallback?.image || "",
        source: best.source,
        matchedTitle: best.title || clean(title),
        contentId: best.contentId,
        address: best.address,
        query: keyword,
        status: "live",
      };
    }
  }

  return {
    image: "", source: "", matchedTitle: clean(title), contentId: "", address: "", query: "",
    status: providerWorked ? "empty" : "error",
  };
}