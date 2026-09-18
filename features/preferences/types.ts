export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** OS/browser-derived rendering state. No app-level motion preference. */
export type Motion = "full" | "calm";

/** Root font-size step. Always public: it is an accessibility setting, not a
 * deferred presentation option, so `presentationOptionsEnabled()` never gates it. */
export type TextScale = "standard" | "large" | "larger";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  textScale: TextScale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  toggleTheme: () => void;
  setTextScale: (value: TextScale) => void;
  t: (key: string, fallback: string) => string;
};
