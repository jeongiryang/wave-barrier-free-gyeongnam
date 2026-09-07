import type { Env } from "../shared/env";
import { json } from "../shared/http";
import { attemptProvider, commonParams, fetchTourismData } from "../shared/provider-data";

// Revalidate a public tourism ID only. No user position or stored archive is sent.
export async function handlePlaceCoordinates(url: URL, env: Env) {
  const id = url.searchParams.get("contentId") || "";
  if (!/^[1-9]\d{0,11}$/.test(id)) return json({ status: "invalid-id" }, 400);
  const result = await attemptProvider(fetchTourismData(env, "KorService2", "detailCommon2", {
    ...commonParams("1"), contentId: id, defaultYN: "Y", mapinfoYN: "Y",
  }));
  if (!result.ok) return json({ id, status: "provider-error" }, 502);
  if (!result.value.items.length) return json({ id, status: "empty" });
  const item = result.value.items.find(value => String(value.contentid) === id);
  if (!item) return json({ id, status: "invalid-response" }, 502);
  const mapX = String(item.mapx ?? "").trim(), mapY = String(item.mapy ?? "").trim();
  if (!mapX || !mapY) return json({ id, status: "coordinates-missing" });
  if (!Number.isFinite(Number(mapX)) || Number(mapX) < 124 || Number(mapX) > 132
    || !Number.isFinite(Number(mapY)) || Number(mapY) < 33 || Number(mapY) > 39) {
    return json({ id, status: "invalid-response" }, 502);
  }
  return json({ id, status: "available", mapX, mapY, source: "ⓒ한국관광공사" });
}
