"use client";

import { createContext, startTransition, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy } from "./translations";
import { readStoredPreferences, writeStoredPreferences } from "./storage";
import type { Locale, Motion, PreferencesValue, Theme, Tone } from "./types";
import { presentationOptionsEnabled } from "./presentation-release";

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [theme, setTheme] = useState<Theme>("light");
  const [tone, setToneState] = useState<Tone>("standard");
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const motion: Motion = systemReducedMotion ? "calm" : "full";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredPreferences();
      // Let streamed children finish hydrating before changing their context.
      // An urgent update can replace the server DOM and discard keyboard focus.
      startTransition(() => {
        setLocaleState(stored.locale);
        setTheme(stored.theme);
        setToneState(stored.tone);
        setSystemReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        setHydrated(true);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncSystemMotion = () => {
      startTransition(() => setSystemReducedMotion(query.matches));
    };
    syncSystemMotion();
    query.addEventListener("change", syncSystemMotion);
    return () => query.removeEventListener("change", syncSystemMotion);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    // The locale switch currently translates only selected controls. Keep the
    // document language truthful so screen readers do not pronounce the
    // remaining Korean interface with a foreign-language voice.
    document.documentElement.lang = "ko";
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.motion = motion;
    document.documentElement.dataset.tone = tone;
    writeStoredPreferences({ locale, theme, tone });
  }, [locale, theme, tone, motion, hydrated]);

  const value = useMemo<PreferencesValue>(() => ({
    locale,
    theme,
    tone,
    hydrated,
    setLocale: (next) => { if (presentationOptionsEnabled()) setLocaleState(next); },
    motion,
    toggleTheme: () => { if (presentationOptionsEnabled()) setTheme((current) => current === "dark" ? "light" : "dark"); },
    // 말투는 한국어 화면의 설정이므로 발표용 게이트로 막지 않는다.
    setTone: (next) => setToneState(next === "gyeongnam" ? "gyeongnam" : "standard"),
    t: (key, fallback) => copy[locale][key] || fallback,
  }), [locale, theme, tone, hydrated, motion]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useSitePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("SitePreferencesProvider is required");
  return value;
}
