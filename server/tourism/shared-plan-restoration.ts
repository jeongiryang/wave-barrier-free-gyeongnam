import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import { attemptProvider as attempt, commonParams, fetchTourismData as fetchKto } from "../shared/provider-data";
import { profileFields, regionCodes } from "./catalog";
import { buildPlan } from "./plan-builder";
import { placeFrom } from "./accessibility-model";

export async function restoreSharedPlan(
  env: Env,
  saved: Record<string, unknown>,
  selections: Record<string, unknown>,
  currentPlanPromise: Promise<Awaited<ReturnType<typeof buildPlan>>>,
) {
  const refs = (Array.isArray(saved.placeRefs) ? saved.placeRefs : [])
    .map((value) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {})
    .map((value) => ({ contentId: clean(value.contentId, 80), order: Math.max(0, Math.trunc(Number(value.order) || 0)) }))
    .filter((value) => value.contentId)
    .sort((left, right) => left.order - right.order)
    .slice(0, 12);
  if (!refs.length) {
    return {
      plan: await currentPlanPromise,
      restoration: { requested: 0, restored: 0, missing: 0, mode: "legacy" },
    };
  }

  const region = regionCodes[clean(selections.region, 20)] ? clean(selections.region, 20) : "창원";
  const profiles = Array.isArray(selections.profiles)
    ? selections.profiles.map((value) => clean(value, 20)).filter((value) => profileFields[value]).slice(0, 6)
    : [];
  const officialPlacesPromise = Promise.all(refs.map(async ({ contentId }, index) => {
    const [common, barrier] = await Promise.all([
      attempt(fetchKto(env, "KorService2", "detailCommon2", {
        ...commonParams("1"),
        contentId,
        defaultYN: "Y",
        firstImageYN: "Y",
        areacodeYN: "Y",
        addrinfoYN: "Y",
        mapinfoYN: "Y",
        overviewYN: "Y",
      })),
      attempt(fetchKto(env, "KorWithService2", "detailWithTour2", {
        ...commonParams("1"),
        contentId,
      })),
    ]);
    const item = common.ok ? common.value.items[0] : null;
    return item
      ? placeFrom(item, barrier.ok ? barrier.value.items[0] || {} : {}, region, profiles, index)
      : null;
  }));
  const [currentPlan, officialPlaces] = await Promise.all([currentPlanPromise, officialPlacesPromise]);
  const currentById = new Map(currentPlan.places.map((place) => [place.id, place]));
  const restored = officialPlaces.map((place, index) => place || currentById.get(refs[index].contentId) || null);
  const places = restored.filter((place): place is NonNullable<typeof place> => Boolean(place));
  const missing = Math.max(0, refs.length - places.length);
  if (!places.length) {
    return {
      plan: currentPlan,
      restoration: {
        requested: refs.length,
        restored: 0,
        missing: refs.length,
        mode: "condition-fallback",
      },
    };
  }
  const stops = places.slice(0, 3).map((place, index) => ({
    title: place.name,
    note: index === 0 ? `${place.features.slice(0, 2).join("·")} 정보를 먼저 확인해요.` : place.summary,
    source: place.source,
  }));
  return {
    plan: { ...currentPlan, places, stops },
    restoration: { requested: refs.length, restored: places.length, missing, mode: "content-id" },
  };
}
