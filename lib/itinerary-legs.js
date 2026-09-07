import { hasJourneyEstimate } from "./route-estimates.js";
import { supportedPlacePoint as point } from "./map-coordinates.js";

/** Build every leg from the same ordered places and dates as the itinerary. */
export function buildItineraryLegs({ places, days, assignments = {}, origin, originLabel, privateOrigin = false }) {
  return days.flatMap((day) => {
    let previous = null;
    return places.filter((place) => (assignments[place.id] || days[0]) === day).map((place) => {
      const from = previous ? point(previous.mapX, previous.mapY) : point(origin.lng, origin.lat);
      const to = point(place.mapX, place.mapY);
      const fromLabel = previous?.name || originLabel;
      const blocked = !previous && privateOrigin;
      const key = JSON.stringify([day, previous?.id || "origin", place.id, from, to, blocked]);
      previous = place;
      return { key, day, place, from, to, fromLabel, blocked };
    });
  });
}

export function usableLegRoutes(bundle, mode) {
  return (bundle?.alternatives || []).filter((route) => hasJourneyEstimate(route)
    && (mode === "transit" ? ["transit", "train", "bus"].includes(route.mode) : route.mode === mode))
    .sort((a, b) => a.totalTime - b.totalTime);
}
