export type HelpSituation = "body" | "lost" | "equipment" | "companion";

export type HelpRequestState = {
  situation: HelpSituation | null;
  placeName: string | null;
  placeAddress: string | null;
};

export function helpMessage(situation: HelpSituation | null, placeName: string | null): string;
export function helpSituations(): { id: HelpSituation; label: string }[];
