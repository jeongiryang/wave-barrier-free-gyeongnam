"use client";
import { useCallback, useEffect, useState } from 'react';
import { GUIDANCE_KEY, readTripValue, subscribeTripStorage, writeTripValue } from '../../../lib/current-trip-storage.js';
import { sanitizeGuidancePreferences, type GuidancePreferences } from '../../../lib/guidance-preferences.js';

export function useTripGuidancePreferences() {
  const [value, setValue] = useState<GuidancePreferences>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const read = () => {
      try { setValue(sanitizeGuidancePreferences(JSON.parse(readTripValue(localStorage, GUIDANCE_KEY) || '{}'))); }
      catch { setValue({}); }
      setReady(true);
    };
    read();
    return subscribeTripStorage(read);
  }, []);
  const update = useCallback((next: GuidancePreferences) => {
    const safe = sanitizeGuidancePreferences(next);
    setValue(safe);
    try { writeTripValue(localStorage, GUIDANCE_KEY, JSON.stringify(safe)); } catch { /* Keep the current interaction usable. */ }
  }, []);
  return { value, ready, update };
}
