export type ParkingContactContent = {
  parkingName: string;
  phoneNumber?: string;
  inquiryText: string;
};

export function normalizeParkingPhone(value: unknown): string;
export function buildParkingContactContent(input?: { parkingName?: unknown; phoneNumber?: unknown; placeName?: unknown }): ParkingContactContent;
export function isKakaoRelayOpen(value?: Date): boolean;
