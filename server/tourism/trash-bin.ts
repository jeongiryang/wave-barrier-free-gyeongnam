import type { Env } from "../shared/env";
import { clean, json } from "../shared/http";
import { attemptProvider, commonParams, fetchTourismData } from "../shared/provider-data";
import { requestProvider } from "../shared/provider-request.js";
import { supportedPlacePoint } from "../../lib/map-coordinates.js";
import { rankTrashBins, type TrashBinItem } from "../../lib/trash-bin.js";
import { SERVER_BUDGET_MS, budgetClock } from "../../lib/request-budget.js";
import { createBoundedSnapshotCache } from "../shared/bounded-snapshot";

const snapshots = createBoundedSnapshotCache(100, 50);
const allowedQueries = new Set(["action", "contentId"]);
const isGyeongnamPlace = (place: Record<string, unknown>) => String(place.lDongRegnCd || "") === "48" || String(place.areacode || "") === "36";

function providerItems(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const response = root.response as { header?: { resultCode?: unknown }; body?: { items?: unknown } } | undefined;
  if (response?.header && String(response.header.resultCode ?? "") !== "00") return null;
  const candidates = [response?.body?.items, root.items, root.records, root.data];
  for (const candidate of candidates) {
    const value = candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as { item?: unknown }).item ?? candidate
      : candidate;
    if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  return null;
}

export async function fetchTrashBinData(env: Env): Promise<Record<string, unknown>[]> {
  const endpoint = env.WASTE_BIN_API_URL?.trim();
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!endpoint || !/^https:\/\//i.test(endpoint) || !key) throw new Error("쓰레기통 공식 데이터 연결 설정 필요");
  const url = new URL(endpoint);
  // The shared environment accepts the portal's encoded key. Decode once before
  // URLSearchParams performs the single encoding required for transport.
  let decodedKey = key;
  try { decodedKey = decodeURIComponent(key); } catch { /* Already a raw key. */ }
  url.searchParams.set("serviceKey", decodedKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "30000");
  url.searchParams.set("type", "json");
  const response = await requestProvider({ provider: "trash-bin", family: "public-data", operation: "operator-configured-official-dataset" }, url.toString(), {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(SERVER_BUDGET_MS.trashBin),
  }, fetch);
  if (!response.ok) throw new Error(`쓰레기통 데이터 응답 ${response.status}`);
  let data: unknown;
  try { data = JSON.parse(await response.text()); } catch { throw new Error("쓰레기통 데이터 형식 오류"); }
  const items = providerItems(data);
  if (!items) throw new Error("쓰레기통 데이터 응답 계약 오류");
  return items;
}

export async function handleTrashBin(url: URL, env: Env) {
  const contentId = url.searchParams.get("contentId") || "";
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 2 || keys.some(key => !allowedQueries.has(key)) || url.searchParams.getAll("action").length !== 1 || url.searchParams.getAll("contentId").length !== 1 || !/^[1-9]\d{0,11}$/.test(contentId)) {
    return json({ status: "invalid-request", contentId, checkedAt: new Date().toISOString(), source: "", items: [], error: "공개 관광지 ID만 요청할 수 있습니다." }, 400);
  }
  const remaining = budgetClock(SERVER_BUDGET_MS.trashBin);
  const placeSnapshot = await snapshots.get(`trash-bin-place:${contentId}`, 15 * 60_000, remaining, async () => {
    const result = await attemptProvider(fetchTourismData(env, "KorService2", "detailCommon2", { ...commonParams("1"), contentId }));
    return result.ok && !result.value.partial ? result.value.items : null;
  });
  const source = clean(env.WASTE_BIN_API_SOURCE, 120) || "공공데이터포털 가로 휴지통 데이터";
  if (!placeSnapshot) return json({ status: "provider-error", contentId, checkedAt: new Date().toISOString(), source, items: [], error: "관광지 위치를 확인하지 못했습니다." }, 502);
  const place = placeSnapshot.value.find(item => String(item.contentid) === contentId);
  if (!place || !isGyeongnamPlace(place)) return json({ status: "invalid-request", contentId, checkedAt: placeSnapshot.checkedAt, source, items: [], error: "경남의 공식 관광지만 요청할 수 있습니다." }, 400);
  const point = supportedPlacePoint(place.mapx, place.mapy);
  if (!point) return json({ status: "location-unconfirmed", contentId, checkedAt: placeSnapshot.checkedAt, source, items: [] }, 200);
  const resultSnapshot = await snapshots.get<TrashBinItem[]>(`trash-bin:${contentId}`, 24 * 60 * 60_000, remaining, async () => {
    try { return rankTrashBins(await fetchTrashBinData(env), { latitude: point.lat, longitude: point.lng }, 15); }
    catch { return null; }
  });
  if (!resultSnapshot) return json({ status: "provider-error", contentId, checkedAt: new Date().toISOString(), source, items: [], error: "쓰레기통 위치를 확인하지 못했습니다." }, 502);
  return json({ status: resultSnapshot.value.length ? "available" : "empty", contentId, checkedAt: resultSnapshot.checkedAt, source, items: resultSnapshot.value });
}

export function resetTrashBinCacheForTest() { snapshots.clear(); }
