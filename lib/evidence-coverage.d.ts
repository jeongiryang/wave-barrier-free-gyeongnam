export type EvidenceCoverage = {
  places: number;
  facilities: number;
  total: number;
  checked: number;
  percent: number | null;
  grade: 'A' | 'B' | 'C' | null;
  confirmed: number;
  negative: number;
  unknown: number;
};

export function assessEvidenceCoverage(
  places: Array<{ accessibility?: Array<{ key: string; state: 'confirmed' | 'negative' | 'unknown' }> }> | null | undefined,
  requiredKeys: string[] | null | undefined,
): EvidenceCoverage;
