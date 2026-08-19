import type { RegionPhoto } from "../content";

export async function fetchRegionPhoto(region: string, signal: AbortSignal) {
  const response = await fetch(`/api/wave?action=photo&region=${encodeURIComponent(region)}`, {
    headers: { Accept: "application/json" }, signal,
  });
  if (!response.ok) throw new Error("photo request failed");
  const payload = await response.json() as { photo?: RegionPhoto | null };
  return payload.photo || null;
}
