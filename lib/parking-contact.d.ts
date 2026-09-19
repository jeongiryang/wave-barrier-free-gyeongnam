export function normalizeParkingPhone(value: unknown): string | null;
export function createParkingTelHref(value: unknown): string | null;
export function buildParkingContactQuestion(input: {
  parkingName: string;
  phoneNumber: string;
  placeName?: string;
}): string | null;
export function isKakaoRelayOpen(value: Date | string | number): boolean;
