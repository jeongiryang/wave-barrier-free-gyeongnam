import { plan } from "./fixtures";
import type { Place } from "../features/planner/types";

const keys = ["parking", "route", "wheelchair", "elevator", "restroom"];
const accessibility: Place["accessibility"] = keys.map(key => ({ key, label: key, state: "confirmed", detail: `${key} 제공 확인` }));
export const confirmedAlternativePlan = { ...plan, criteria: { facilityKeys: keys }, places: plan.places.map(place => ({ ...place, accessibility })) };
const museum = confirmedAlternativePlan.places[0];
export const alternativePlan = { ...confirmedAlternativePlan, places: [...confirmedAlternativePlan.places,
  { ...museum, id: "1003", name: "시민문화쉼터", contentTypeId: "12", mapX: "128.689", mapY: "35.230" },
  { ...museum, id: "1004", name: "강변정원", contentTypeId: "12", mapX: "128.688", mapY: "35.231" },
  { ...museum, id: "1005", name: "편의 미확인 전시실", accessibility: [{ key: "restroom", label: "화장실", state: "unknown" as const, detail: "미확인" }] },
] };
