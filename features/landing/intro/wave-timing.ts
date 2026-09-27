// Real playback begins with waves, gathers into Gyeongnam, holds for reading,
// then disperses. The original icon/caption/exit choreography remains unchanged.
export const ORIGINAL_OPENING_MS = 769;
export const WAVE_FLOW_END_MS = 700;
export const BOUNDARY_FORMED_MS = 1_600;
// Match the other icons' roughly 700–800ms caption window.
export const BOUNDARY_HOLD_END_MS = BOUNDARY_FORMED_MS + 800;
export const OPENING_DURATION_MS = BOUNDARY_HOLD_END_MS + 1_100;
export const OPENING_EXTENSION_MS = OPENING_DURATION_MS - ORIGINAL_OPENING_MS;
export const INTRO_DURATION_MS = 10_000 + OPENING_EXTENSION_MS;
export const INTRO_EXIT_START_MS = 9_150 + OPENING_EXTENSION_MS;

export function toSceneTime(timeMs: number) {
  if (timeMs <= BOUNDARY_HOLD_END_MS) return 0;
  return timeMs <= OPENING_DURATION_MS
    ? (timeMs - BOUNDARY_HOLD_END_MS) * ORIGINAL_OPENING_MS / (OPENING_DURATION_MS - BOUNDARY_HOLD_END_MS)
    : timeMs - OPENING_EXTENSION_MS;
}

export function toPlaybackTime(sceneMs: number) {
  return sceneMs <= ORIGINAL_OPENING_MS
    ? BOUNDARY_HOLD_END_MS + sceneMs * (OPENING_DURATION_MS - BOUNDARY_HOLD_END_MS) / ORIGINAL_OPENING_MS
    : sceneMs + OPENING_EXTENSION_MS;
}
