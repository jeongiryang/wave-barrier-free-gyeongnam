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
  ko: { on: "파동 효과 켜기", off: "파동 효과 끄기" },
  en: { on: "Turn wave effects on", off: "Turn wave effects off" },
  ja: { on: "波の効果をオン", off: "波の効果をオフ" },
  "zh-Hans": { on: "开启波浪效果", off: "关闭波浪效果" },
  "zh-Hant": { on: "開啟波浪效果", off: "關閉波浪效果" },
  fr: { on: "Activer les vagues", off: "Désactiver les vagues" },
  de: { on: "Welleneffekt einschalten", off: "Welleneffekt ausschalten" },
  ru: { on: "Включить эффект волн", off: "Выключить эффект волн" },
};
