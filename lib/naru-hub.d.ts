import type { AssistantTool } from './assistant-actions';

export type NaruHubItem = {
  id: string;
  label: string; // 화면 문구
  tool: AssistantTool; // ASSISTANT_TOOLS 에 이미 있는 값만 허용
  requires: 'always' | 'itinerary' | 'today' | 'place' | 'saved';
};

export const NARU_HUB_ITEMS: readonly NaruHubItem[];

export type NaruHubContext = {
  hasItinerary: boolean;
  isTripDay: boolean;
  hasFocusedPlace: boolean;
  hasSavedTrip: boolean;
};

export function visibleNaruHubItems(
  items: readonly NaruHubItem[],
  context: NaruHubContext,
  limit: number,
): NaruHubItem[];
