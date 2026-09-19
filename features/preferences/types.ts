export type Locale = "ko" | "en";

export type Theme = "light" | "dark";

/** OS/browser-derived rendering state. No app-level motion preference. */
export type Motion = "full" | "calm";

/** Root font-size step. Always public: it is an accessibility setting, not a
 * deferred presentation option, so `presentationOptionsEnabled()` never gates it. */
export type ColorAssist = "off" | "on";

export type TextScale = "standard" | "large" | "larger";

export type Haptics = "off" | "on";
/** 화면 문구의 말투. 기본은 표준말이다. */
export type Tone = "standard" | "gyeongnam";

export type PreferencesValue = {
  locale: Locale;
  theme: Theme;
  textScale: TextScale;
  colorAssist: ColorAssist;
  haptics: Haptics;
  setHaptics: (value: Haptics) => void;
  tone: Tone;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  motion: Motion;
  toggleTheme: () => void;
  setColorAssist: (value: ColorAssist) => void;
  setTextScale: (value: TextScale) => void;
  setTone: (value: Tone) => void;
  t: (key: string, fallback: string) => string;
};
