export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** OS/browser-derived rendering state. No app-level motion preference. */
export type Motion = "full" | "calm";

/** 짧은 확인 진동. 보조 신호이므로 기본은 끄기다. */
export type Haptics = "off" | "on";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  toggleTheme: () => void;
  haptics: Haptics;
  setHaptics: (haptics: Haptics) => void;
  t: (key: string, fallback: string) => string;
};
