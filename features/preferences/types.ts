export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** full: 파동이 흐른다. calm: 정지 화면으로 대체한다. */
export type Motion = "full" | "calm";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  systemReducedMotion: boolean;
  toggleTheme: () => void;
  toggleMotion: () => void;
  t: (key: string, fallback: string) => string;
};
