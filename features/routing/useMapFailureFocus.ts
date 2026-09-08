"use client";

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import type { MapProvider } from "./types";

/** Restore only displaced map-panel focus, after React commits the recovery UI. */
export function useMapFailureFocus(provider: MapProvider, shellRef: RefObject<HTMLElement | null>) {
  const displacedFocus = useRef<HTMLElement | null>(null);
  const rememberFailureFocus = useCallback(() => {
    const focused = document.activeElement;
    displacedFocus.current = focused instanceof HTMLElement && shellRef.current?.contains(focused)
      && focused.closest(".map-tool-panel:not(#map-panel-export),.map-roadview-panel,.roadview-pick-banner")
      ? focused : null;
  }, [shellRef]);

  useLayoutEffect(() => {
    if (provider !== "error") return;
    const previous = displacedFocus.current;
    displacedFocus.current = null;
    if (!previous || (document.activeElement !== previous && document.activeElement !== document.body)) return;
    const recovery = shellRef.current?.querySelector<HTMLButtonElement>(".map-unavailable button");
    recovery?.focus({ preventScroll: true });
    recovery?.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }, [provider, shellRef]);

  return rememberFailureFocus;
}
