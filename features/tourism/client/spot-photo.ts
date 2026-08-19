import { safeTourismImageUrl } from "../image-url";

type SpotPhotoQuery = {
  contentId: string;
  region: string;
  title: string;
  tag: string;
};

export async function fetchOfficialSpotPhoto(query: SpotPhotoQuery, signal: AbortSignal) {
  const params = new URLSearchParams({ action: "spot-photo", region: query.region, title: query.title, tag: query.tag });
  if (query.contentId) params.set("contentId", query.contentId);
  const response = await fetch(`/api/wave?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const data = response.ok ? await response.json() as { image?: string } : null;
  return safeTourismImageUrl(data?.image);
}
