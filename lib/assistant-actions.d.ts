export type AssistantAction = { action: string; region?: string; profiles?: string[]; themes?: string[]; placeId?: string; minutes?: number; purpose?: 'nap'|'nursing'; direction?: 'up'|'down'; date?: string; time?: string; tool?: string; start?: string; end?: string; indoor?: boolean; pace?: 'relaxed'|'standard'; transport?: 'walk'|'bicycle'|'transit'|'car'; originRegion?: string; festival?: string; reason?: 'rain'|'fatigue'|'change'|'closed' };
export const ASSISTANT_TOOLS: string[];
/** One of the ASSISTANT_TOOLS values; kept as a type-only alias so lib/assistant-actions.js stays untouched. */
export type AssistantTool = string;
export const ASSISTANT_ACTIONS: string[];
export function validateAssistantAction(value: unknown, placeIds?: string[]): AssistantAction | null;
export function localAssistantAction(text: string, places?: Array<{ id: string; name: string }>): AssistantAction;
