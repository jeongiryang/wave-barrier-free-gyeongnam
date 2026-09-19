import type { GuidancePreferences } from './guidance-preferences.js';
export type AudioGuideMode = 'audio' | 'text' | 'easy';
export function audioGuideModeForPreferences(value: GuidancePreferences | unknown): AudioGuideMode;
export function audioGuideKeySentences(value: unknown, maximum?: number): string[];
