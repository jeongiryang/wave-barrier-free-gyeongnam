"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { plannerJson } from "../services/api";
import type { PlanData } from "../types";
import { sameOriginHttpUrl } from "../../../lib/security/same-origin-url.js";

export interface TripSharingOptions {
  plan: PlanData | null;
  region: string;
  theme: string;
  profiles: string[];
  locale: string;
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  scheduleAssignments: Record<string, string>;
  selectedPlaceIds: string[];
  originLabel: string;
}

export function useTripSharing(options: TripSharingOptions) {
  // The immutable request body identifies the snapshot, not the hook's lifetime.
  const snapshot = JSON.stringify({
    plan: options.plan,
    selections: {
      region: options.region, theme: options.theme, profiles: options.profiles, locale: options.locale,
      travelStart: options.travelStart, travelEnd: options.travelEnd, dayStartTime: options.dayStartTime,
      scheduleAssignments: options.scheduleAssignments, selectedPlaceIds: options.selectedPlaceIds,
    },
    origin: { label: options.originLabel },
  });
  type ShareState = "idle" | "saving" | "done" | "error" | "copy-error";
  const [result, setResult] = useState<{ snapshot: string; state: ShareState; url: string }>({ snapshot: "", state: "idle", url: "" });
  const shareState = result.snapshot === snapshot ? result.state : "idle";
  const shareUrl = result.snapshot === snapshot ? result.url : "";
  const active = useRef({ snapshot, version: 0 });
  const pendingShare = useRef<{ version: number; promise: Promise<string> } | null>(null);
  useLayoutEffect(() => {
    active.current = { snapshot, version: active.current.version + 1 };
    return () => { active.current.version++; };
  }, [snapshot]);
  const ensureShareUrl = useCallback(async () => {
    if (shareUrl) return shareUrl;
    const version = active.current.version;
    if (pendingShare.current?.version === version) return pendingShare.current.promise;
    const body = JSON.parse(snapshot);
    if (!body.plan) throw new Error("공유할 여행 계획이 없습니다.");
    const isCurrent = () => active.current.version === version && active.current.snapshot === snapshot;
    setResult({ snapshot, state: "saving", url: "" });
    const request = (async () => {
      const data = await plannerJson<{ url?: string }>("/api/trips", {
        method: "POST",
        body,
      });
      // Reject obsolete results for both copy and calendar consumers. Never delete an already issued link.
      if (!isCurrent()) throw new Error("일정이 변경되었습니다. 현재 일정으로 다시 시도해 주세요.");
      const safeUrl = sameOriginHttpUrl(data.url, window.location.origin);
      if (!safeUrl) throw new Error("공유 링크를 만들지 못했습니다.");
      setResult({ snapshot, state: "idle", url: safeUrl });
      return safeUrl;
    })();
    pendingShare.current = { version, promise: request };
    try {
      return await request;
    } catch (error) {
      if (isCurrent()) setResult({ snapshot, state: "error", url: "" });
      throw error;
    } finally {
      if (pendingShare.current?.promise === request) pendingShare.current = null;
    }
  }, [snapshot, shareUrl]);

  const sharePlan = useCallback(async () => {
    const version = active.current.version;
    let url = "";
    try {
      url = await ensureShareUrl();
      if (active.current.version !== version) return;
      if (!navigator.clipboard?.writeText) throw new Error("링크를 직접 복사해 주세요.");
      await navigator.clipboard?.writeText(url);
      if (active.current.version === version) setResult({ snapshot, state: "done", url });
    } catch {
      if (active.current.version === version) setResult({ snapshot, state: url ? "copy-error" : "error", url });
    }
  }, [ensureShareUrl, snapshot]);

  return { shareState, shareUrl, sharePlan, ensureShareUrl };
}
