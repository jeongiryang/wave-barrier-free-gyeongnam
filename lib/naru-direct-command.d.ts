import type { AssistantAction } from './assistant-actions.js';
export function naruEditClarification(text: string): string | null;
export function naruDirectCommand(text: string, places?: Array<{ id: string; name: string }>): AssistantAction | null;
