export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** 색 말고도 알 수 있는 단서를 더 강하게 켜는 표시 설정. 진단명이 아니라 하는 일로 적는다. */
export type ColorAssist = "off" | "on";

/** OS/browser-derived rendering state. No app-level motion preference. */
export type Motion = "full" | "calm";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  colorAssist: ColorAssist;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  toggleTheme: () => void;
  setColorAssist: (value: ColorAssist) => void;
  t: (key: string, fallback: string) => string;
};
