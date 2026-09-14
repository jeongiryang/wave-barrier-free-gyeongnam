export type GuidancePreferences = { briefAnswers?: true; oneAtATime?: true; textFirst?: true };
export const GUIDANCE_PREFERENCES: string[];
export function sanitizeGuidancePreferences(value: unknown): GuidancePreferences;
export function guidancePreferenceText(value: unknown): string[];
