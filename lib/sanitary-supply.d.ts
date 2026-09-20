export type SanitarySupplyItem = { id: string; name: string; address: string; distanceMeters: number; destination: { latitude: number; longitude: number }; availableHours?: string; usageNote?: string; institutionName?: string; referenceDate: string };
export function normalizeSanitarySupply(value: unknown): Omit<SanitarySupplyItem, 'distanceMeters'> | null;
export function rankSanitarySupplies(values: unknown, origin: { latitude: number; longitude: number }, limit?: number): SanitarySupplyItem[];
