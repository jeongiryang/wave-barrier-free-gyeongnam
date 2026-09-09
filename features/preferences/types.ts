export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** OS/browser-derived rendering state. No app-level motion preference. */
export type Motion = "full" | "calm";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  toggleTheme: () => void;
  t: (key: string, fallback: string) => string;
};
