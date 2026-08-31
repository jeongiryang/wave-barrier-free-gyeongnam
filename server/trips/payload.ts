import { clean } from "../shared/http";
import { contentTypes, languageServices, profileFields, regionCodes } from "../tourism/catalog";

export function normalizeTripSelections(rawSelections: Record<string, unknown>) {
  const requestedRegion = clean(rawSelections.region, 20);
  const requestedTheme = clean(rawSelections.theme, 20);
  const requestedLocale = clean(rawSelections.locale || "ko", 20);
  const rawProfiles = Array.isArray(rawSelections.profiles) ? rawSelections.profiles : [];
  const rawAssignments = rawSelections.scheduleAssignments
    && typeof rawSelections.scheduleAssignments === "object"
    && !Array.isArray(rawSelections.scheduleAssignments)
    ? rawSelections.scheduleAssignments as Record<string, unknown>
    : {};
  const rawSelectedPlaceIds = Array.isArray(rawSelections.selectedPlaceIds)
    ? rawSelections.selectedPlaceIds
    : [];
  const date = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value, 10))
    ? clean(value, 10)
    : "";
  return {
    region: regionCodes[requestedRegion] ? requestedRegion : "창원",
    theme: contentTypes[requestedTheme] ? requestedTheme : "nature",
    profiles: [...new Set(rawProfiles
      .map((value) => clean(value, 20))
      .filter((value) => profileFields[value]))].slice(0, 6),
    locale: languageServices[requestedLocale] ? requestedLocale : "ko",
    travelStart: date(rawSelections.travelStart),
    travelEnd: date(rawSelections.travelEnd),
    dayStartTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(clean(rawSelections.dayStartTime, 5))
      ? clean(rawSelections.dayStartTime, 5)
      : "10:00",
    scheduleAssignments: Object.fromEntries(Object.entries(rawAssignments)
      .slice(0, 12)
      .map(([placeId, assignedDate]) => [clean(placeId, 80), date(assignedDate)])
      .filter(([placeId, assignedDate]) => placeId && assignedDate)),
    selectedPlaceIds: [...new Set(rawSelectedPlaceIds
      .map((value) => clean(value, 80))
      .filter(Boolean))].slice(0, 12),
  };
}

export function storedTripPayload(body: Record<string, unknown>, selections: ReturnType<typeof normalizeTripSelections>) {
  const plan = (body.plan && typeof body.plan === "object" ? body.plan : {}) as Record<string, unknown>;
  const places = Array.isArray(plan.places) ? plan.places as Array<Record<string, unknown>> : [];
  const origin = (body.origin && typeof body.origin === "object" ? body.origin : {}) as Record<string, unknown>;
  const placesById = new Map(places.map((place) => [clean(place.id, 80), place]));
  const selectedPlaces = selections.selectedPlaceIds.length
    ? selections.selectedPlaceIds.map((id) => placesById.get(id)).filter((place): place is Record<string, unknown> => Boolean(place))
    : places;
  return {
    selections,
    origin: { label: clean(origin.label || "선택 출발지", 80) },
    placeRefs: (selectedPlaces.length ? selectedPlaces : places).slice(0, 6).map((place, order) => ({
      contentId: clean(place.id, 80),
      order,
    })),
  };
}
