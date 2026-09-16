export const GUIDANCE_PREFERENCES = ['briefAnswers', 'oneAtATime', 'textFirst', 'audioFirst', 'easyNarration'];

/** Store interaction choices only. Persona or diagnosis labels are never persisted. */
export function sanitizeGuidancePreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(GUIDANCE_PREFERENCES.filter(key => value[key] === true).map(key => [key, true]));
}

export function guidancePreferenceText(value) {
  const safe = sanitizeGuidancePreferences(value);
  return [safe.briefAnswers && '짧은 답변', safe.oneAtATime && '한 번에 하나씩', safe.textFirst && '문자 안내 우선', safe.audioFirst && '음성 안내 우선', safe.easyNarration && '쉬운 해설'].filter(Boolean);
}
