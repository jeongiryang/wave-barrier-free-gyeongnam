import type { MapPlace } from "../routing/types";
import type { Place, RichSpot } from "./types";

export function richSpotToPlace(spot: RichSpot, region: string): Place {
  return {
    id: spot.id,
    contentTypeId: "",
    city: region,
    name: spot.title,
    address: spot.address,
    summary: spot.summary,
    image: spot.image,
    mapX: spot.mapX,
    mapY: spot.mapY,
    score: null,
    features: [spot.tag],
    details: [spot.summary],
    source: spot.source,
  };
}

export function mapPlaceToPlannerPlace(mapPlace: MapPlace, region: string): Place {
  return {
    id: mapPlace.id,
    contentTypeId: "12",
    city: region,
    name: mapPlace.name,
    address: mapPlace.address || "지도에서 선택한 위치",
    summary: mapPlace.summary || "지도에서 직접 선택한 목적지입니다.",
    image: mapPlace.image || "",
    mapX: mapPlace.mapX,
    mapY: mapPlace.mapY,
    score: mapPlace.score,
    features: [],
    details: ["선택한 좌표를 기준으로 교통 경로를 조회합니다."],
    source: "지도 직접 선택",
  };
}
