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

export const motionCopy: Record<Locale, { on: string; off: string }> = {
  ko: { on: "동작 효과 켜기", off: "동작 효과 줄이기" },
  en: { on: "Turn motion effects on", off: "Reduce motion effects" },
};
