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
  { id: "ja", label: "日本語", short: "JA", beta: true },
  { id: "zh-Hans", label: "简体中文", short: "简", beta: true },
  { id: "zh-Hant", label: "繁體中文", short: "繁", beta: true },
  { id: "fr", label: "Français", short: "FR", beta: true },
  { id: "de", label: "Deutsch", short: "DE", beta: true },
  { id: "ru", label: "Русский", short: "RU", beta: true },
];

export const motionCopy: Record<Locale, { on: string; off: string }> = {
  ko: { on: "동작 효과 켜기", off: "동작 효과 줄이기" },
  en: { on: "Turn motion effects on", off: "Reduce motion effects" },
  ja: { on: "動きの効果をオン", off: "動きの効果を減らす" },
  "zh-Hans": { on: "开启动态效果", off: "减少动态效果" },
  "zh-Hant": { on: "開啟動態效果", off: "減少動態效果" },
  fr: { on: "Activer les animations", off: "Réduire les animations" },
  de: { on: "Bewegungseffekte einschalten", off: "Bewegungseffekte reduzieren" },
  ru: { on: "Включить анимацию", off: "Уменьшить анимацию" },
};
