import type { Env } from "../shared/env";
import { clean, json } from "../shared/http";
import { regionCodes } from "./catalog";
import { buildEnrichment, fetchCrowd } from "./insights";
import { apiStatus } from "./provider-model";
import { buildPlan } from "./plan-builder";
import { fetchPhoto, fetchSpotPhoto, photoFrom } from "./photos";
import { recordOperationalEvent } from "../shared/observability";

function selectedRegion(url: URL) {
  const requested = clean(url.searchParams.get("region"), 20);
  return regionCodes[requested] ? requested : "창원";
}

async function handlePhoto(url: URL, env: Env) {
  const region = selectedRegion(url);
  const result = await fetchPhoto(env, region);
  return json({
    photo: photoFrom(result, region),
    status: apiStatus("photo", "관광사진 정보", "지역 관광사진", result),
  }, result.ok ? 200 : 502, true);
}

async function handleSpotPhoto(url: URL, env: Env) {
  const region = selectedRegion(url);
  const title = clean(url.searchParams.get("title"), 100);
  const tag = clean(url.searchParams.get("tag"), 80);
  const contentId = clean(url.searchParams.get("contentId"), 80);
  if (!title) return json({ error: "사진을 찾을 장소명이 필요합니다." }, 400);
  const result = await fetchSpotPhoto(env, region, title, tag, contentId);
  recordOperationalEvent("tourism_photo", { region, status: result.status, source: result.source || "none" });
  return json(result, 200, true);
}

async function handleCrowd(url: URL, env: Env) {
  const region = selectedRegion(url);
  const title = clean(url.searchParams.get("title"), 100);
  const result = await fetchCrowd(env, region, title);
  const item = result.ok ? result.value.items[0] : undefined;
  return json({
    crowd: item ? {
      rate: Number(item.cnctrRate || 0),
      baseYmd: clean(item.baseYmd),
      place: clean(item.tAtsNm || title),
    } : null,
    status: apiStatus("crowd", "관광지 집중률 예측", "선택 관광지 혼잡 예측", result),
  }, result.ok ? 200 : 502, true);
}

export async function handleWaveApi(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  if (!env.TOUR_API_SERVICE_KEY_ENCODED) {
    return json({ error: "서버 인증키 설정을 확인해 주세요." }, 503);
  }
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "plan";
  if (action === "photo") return handlePhoto(url, env);
  if (action === "spot-photo") return handleSpotPhoto(url, env);
  if (action === "crowd") return handleCrowd(url, env);
  if (action === "enrich") {
    try {
      return json(await buildEnrichment(request, env), 200, true);
    } catch (error) {
      return json({
        error: error instanceof Error
          ? clean(error.message, 120)
          : "확장 관광 데이터를 처리하지 못했습니다.",
      }, 502);
    }
  }
  if (action !== "plan") return json({ error: "지원하지 않는 작업입니다." }, 400);
  try {
    return json(await buildPlan(request, env), 200, true);
  } catch (error) {
    return json({
      error: error instanceof Error ? clean(error.message, 120) : "관광 데이터를 처리하지 못했습니다.",
    }, 502);
  }
}
