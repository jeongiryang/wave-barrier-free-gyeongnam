"use client";

import { createContext, startTransition, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy } from "./translations";
import { readStoredPreferences, writeStoredPreferences } from "./storage";
import type { Locale, Motion, PreferencesValue, Theme } from "./types";

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function SitePreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [theme, setTheme] = useState<Theme>("light");
  const [motionPreference, setMotionPreference] = useState<Motion>("full");
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const motion: Motion = systemReducedMotion || motionPreference === "calm" ? "calm" : "full";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredPreferences();
      // Let streamed children finish hydrating before changing their context.
      // An urgent update can replace the server DOM and discard keyboard focus.
      startTransition(() => {
        setLocaleState(stored.locale);
        setTheme(stored.theme);
        setMotionPreference(stored.motion);
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
    writeStoredPreferences({ locale, theme, motion: motionPreference });
  }, [locale, theme, motion, motionPreference, hydrated]);

  const value = useMemo<PreferencesValue>(() => ({
    locale,
    theme,
    hydrated,
    setLocale: setLocaleState,
    motion,
    systemReducedMotion,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
    toggleMotion: () => setMotionPreference((current) => current === "calm" ? "full" : "calm"),
    t: (key, fallback) => copy[locale][key] || fallback,
  }), [locale, theme, hydrated, motion, systemReducedMotion]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useSitePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("SitePreferencesProvider is required");
  return value;
}
