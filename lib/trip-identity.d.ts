export type TripBinding = { kind: 'local'; id: string } | { kind: 'account'; id: string; userId: string; revision: number; role: 'owner'|'member' };
export type TripIdentity = { version: 1; id: string; binding: TripBinding | null; share: { id: string; revision: number; expiresAt: number; snapshotHash?: string } | null };
export const TRIP_IDENTITY_KEY: string;
export function cleanIdentity(value: unknown): TripIdentity | null;
export function newTripIdentity(): TripIdentity;
export function readTripIdentity(storage: Storage): TripIdentity | null;
export function ensureTripIdentity(storage: Storage): TripIdentity;
export function writeTripIdentity(storage: Storage, identity: TripIdentity): TripIdentity;
