export type RegionRecord = { region: string; visited: boolean; firstRecordedOn: string | null };
export function regionRecords(trips: Array<{ region: string; completedAt: string | null }>, regions: readonly string[]): RegionRecord[];
