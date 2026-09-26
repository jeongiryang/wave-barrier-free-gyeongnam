import type { RestroomAlternative } from './restroom-alternatives.js';
export type FestivalAmenitiesResult = { status: 'available' | 'empty' | 'error'; items: RestroomAlternative[]; source: string; checkedAt: string };
export function readFestivalAmenities(value: unknown, contentId: string): FestivalAmenitiesResult;
