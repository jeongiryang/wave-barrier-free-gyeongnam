export type NaruGuide = { step: string; region: string; start: string; end: string; selected: string[]; revision: string; question: string; choices: string[] };
export function startNaruGuide(value: { region: string; start: string; end: string; selected?: string[]; revision: string }): NaruGuide;
export function advanceNaruGuide(state: NaruGuide, answer: string): NaruGuide | null;
