export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** OS/browser-derived rendering state. No app-level motion preference. */
export type Motion = "full" | "calm";

/** 화면 문구의 말투. 기본은 표준말이다. */
export type Tone = "standard" | "gyeongnam";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  tone: Tone;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  toggleTheme: () => void;
  setTone: (value: Tone) => void;
  t: (key: string, fallback: string) => string;
};
