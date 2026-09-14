import { sanitizeGuidancePreferences } from './guidance-preferences.js';

export function audioGuideModeForPreferences(value) {
  const safe = sanitizeGuidancePreferences(value);
  if (safe.textFirst) return 'text';
  if (safe.easyNarration || safe.briefAnswers || safe.oneAtATime) return 'easy';
  return 'audio';
}

/** Shorten the supplied Odii transcript without adding or guessing facts. */
export function audioGuideKeySentences(value, maximum = 5) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (!text) return [];
  const sentences = text.match(/[^.!?。]+[.!?。]?/g) || [text];
  return sentences.map(sentence => sentence.trim()).filter(Boolean).slice(0, Math.max(1, Math.min(8, maximum)));
}
