"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyTrip, replaceCurrentTrip, writeTripValue, REGION_KEY } from "../../../lib/current-trip-storage.js";
import { regions } from "../constants";
import { localDate } from "../utils";

export function useRegionChange({ region, ready, hasSaved, setRegion, resetTrip, clearResults }: {
  region: string; ready: boolean; hasSaved: boolean; setRegion: (region: string) => void;
  resetTrip: (start: string, end: string) => void; clearResults: (fresh: boolean) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const pendingRef = useRef<string | null>(null);
  const afterCommit = useRef<(() => void) | null>(null);
  const initialUrlChecked = useRef(false);
  const cancel = useCallback(() => { pendingRef.current = null; afterCommit.current = null; setPending(null); setError(false); }, []);
  function updateUrl(next: string, fresh = false) {
    const url = new URL(window.location.href);
    url.searchParams.set("region", next);
    if (fresh) { url.searchParams.delete("travelStart"); url.searchParams.delete("travelEnd"); }
    window.history.replaceState(window.history.state, "", url);
  }
  function commit(next: string, fresh: boolean) {
    const start = localDate(), end = localDate(1);
    try {
      if (fresh) replaceCurrentTrip(window.localStorage, emptyTrip(next, start, end));
      else writeTripValue(window.localStorage, REGION_KEY, next);
    } catch { if (hasSaved || fresh) { setError(true); return; } }
    // React batches this event into one render. Abort old responses before they
    // can repopulate the new region; keep the picker DOM for native focus return.
    clearResults(fresh);
    if (fresh) resetTrip(start, end);
    setRegion(next); updateUrl(next, fresh);
    const complete = afterCommit.current;
    cancel(); complete?.();
  }
  function request(next: string, onCommitted?: () => void) {
    if (!ready || pendingRef.current !== null || next === region || !regions.includes(next)) return;
    afterCommit.current = onCommitted || null;
    if (hasSaved) { pendingRef.current = next; setPending(next); setError(false); }
    else commit(next, false);
  }
  useEffect(() => {
    if (!ready) return;
    const checkUrl = () => {
      const next = new URLSearchParams(window.location.search).get("region");
      if (!next || next === region || !regions.includes(next)) return;
      // Browsing history cannot silently merge another region into this trip.
      updateUrl(region);
      request(next);
    };
    if (!initialUrlChecked.current) { initialUrlChecked.current = true; checkUrl(); }
    window.addEventListener("popstate", checkUrl);
    return () => window.removeEventListener("popstate", checkUrl);
  });
  return { pending, error, cancel, request, add: () => { if (pendingRef.current) commit(pendingRef.current, false); }, startNew: () => { if (pendingRef.current) commit(pendingRef.current, true); } };
}
