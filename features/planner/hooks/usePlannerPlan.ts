"use client";

import { usePlannerCriteria } from "./usePlannerCriteria";
import { usePlanRequest } from "./usePlanRequest";

export function usePlannerPlan(locale: string) {
  const criteria = usePlannerCriteria();
  const request = usePlanRequest({ locale, region: criteria.region, selected: criteria.selected, theme: criteria.theme });
  return { ...criteria, ...request };
}
