import { supportedPlacePoint } from "./map-coordinates.js";

/** External handoff only; a URL is not evidence of a verified route.
 * GPS-derived origins remain on-device under the existing location policy.
 * @param {{origin: {lat:number,lng:number}|null, originLabel:string, privateOrigin:boolean, destination:{name:string,mapX:string,mapY:string}|null, mode:string}} options
 */
export function kakaoDirections({ origin, originLabel, privateOrigin, destination, mode }) {
  const to = destination && supportedPlacePoint(destination.mapX, destination.mapY);
  const from = !privateOrigin && origin && supportedPlacePoint(origin.lng, origin.lat);
  const travelMode = { car: "car", transit: "traffic", walk: "walk", bicycle: "bicycle" }[mode];
  const destinationPart = to && destination ? `${encodeURIComponent(destination.name)},${to.lat},${to.lng}` : "";
  if (from && destinationPart && travelMode) {
    return `https://map.kakao.com/link/by/${travelMode}/${encodeURIComponent(originLabel)},${from.lat},${from.lng}/${destinationPart}`;
  }
  return destinationPart ? `https://map.kakao.com/link/to/${destinationPart}`
    : destination ? `https://map.kakao.com/link/search/${encodeURIComponent(destination.name)}` : "https://map.kakao.com/";
}
