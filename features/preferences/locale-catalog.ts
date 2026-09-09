import type { Locale } from "./types";

export interface LocaleOption {
  id: Locale;
  label: string;
  short: string;
  beta: boolean;
}

export const localeOptions: LocaleOption[] = [
  { id: "ko", label: "한국어", short: "KO", beta: false },
  { id: "en", label: "English", short: "EN", beta: true },
];
