export type SceneryCondition = "rain" | "clear" | "other";
export type PlaceSetting = "indoor" | "outdoor" | "unknown";
export type SceneryHint = { text: string; source: string } | null;

export function sceneryCondition(day: { code: number; rainProbability: number }): SceneryCondition;
export function sceneryHint(condition: SceneryCondition, setting: PlaceSetting): SceneryHint;
