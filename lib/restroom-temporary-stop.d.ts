import type { RestroomAlternative, RestroomEvidence } from './restroom-alternatives.js';
export type TemporaryRestroomStop = { kind: 'official-restroom'; sourceId: string; referenceDate: string; evidence: RestroomEvidence };
export function restroomTemporaryStop(restroom: RestroomAlternative): import('../features/planner/types').Place | null;
export function sanitizeTemporaryRestroomStops(values: unknown): Array<Pick<import('../features/planner/types').Place, 'id'|'name'|'address'|'mapX'|'mapY'|'source'|'temporaryStop'>>;
