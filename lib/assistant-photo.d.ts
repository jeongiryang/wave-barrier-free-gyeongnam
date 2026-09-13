export type AssistantPhoto = { mimeType: 'image/jpeg'; data: string };
export const PHOTO_MAX_BYTES: number;
export const PHOTO_MAX_SIDE: number;
export function stripEncodedPhotoMetadata(data: string): string;
export function validateAssistantPhoto(value: unknown): AssistantPhoto | null;
