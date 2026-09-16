export type CompanionInput = { id?: string; name?: string; facilities?: string[]; maxWalkMinutes?: number | null };
export type CompanionState = 'common' | 'unknown' | 'blocked';
export function sanitizeCompanions(value: unknown): Array<{ id: string; name: string; facilities: string[]; maxWalkMinutes: number | null }>;
export function companionCommonGround(companions: unknown, places?: unknown[]): { members: ReturnType<typeof sanitizeCompanions>; requirements: Array<{ key: string; label: string; members: string[] }>; strictestWalkMinutes: number | null; evaluations: Array<{ placeId: string; name: string; state: CompanionState; members: Array<{ id: string; name: string; state: CompanionState; negative: string[]; unknown: string[] }> }>; hasNeeds: boolean };
