/** The same boundary governs displayed, counted, and selected journey estimates. */
export function hasJourneyEstimate(route) {
  return route.configured === true && Number.isFinite(route.totalTime) && route.totalTime > 0;
}
