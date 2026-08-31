"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy } from "./translations";
import { readStoredPreferences, writeStoredPreferences } from "./storage";
import type { Locale, Motion, PreferencesValue, Theme } from "./types";

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [theme, setTheme] = useState<Theme>("light");
  const [motion, setMotion] = useState<Motion>("full");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredPreferences();
      setLocaleState(stored.locale);
      setTheme(stored.theme);
      setMotion(stored.motion);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale === "zh-Hans" ? "zh-CN" : locale === "zh-Hant" ? "zh-TW" : locale;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.dataset.motion = motion;
    writeStoredPreferences({ locale, theme, motion });
  }, [locale, theme, motion, hydrated]);

  const value = useMemo<PreferencesValue>(() => ({
    locale,
    theme,
    hydrated,
    setLocale: setLocaleState,
    motion,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
    toggleMotion: () => setMotion((current) => current === "calm" ? "full" : "calm"),
    t: (key, fallback) => copy[locale][key] || fallback,
  }), [locale, theme, hydrated, motion]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useSitePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("SitePreferencesProvider is required");
  return value;
}

