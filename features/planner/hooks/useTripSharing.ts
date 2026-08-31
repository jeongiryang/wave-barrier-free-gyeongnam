"use client";

import { useCallback, useRef, useState } from "react";
import { plannerJson } from "../services/api";
import type { PlanData } from "../types";

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
  const [shareState, setShareState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const pendingShare = useRef<Promise<string> | null>(null);
  const ensureShareUrl = useCallback(async () => {
    if (shareUrl) return shareUrl;
    if (pendingShare.current) return pendingShare.current;
    if (!options.plan) throw new Error("공유할 여행 계획이 없습니다.");
    setShareState("saving");
    const request = (async () => {
      const data = await plannerJson<{ url?: string }>("/api/trips", {
        method: "POST",
        body: {
          plan: options.plan,
          selections: {
            region: options.region,
            theme: options.theme,
            profiles: options.profiles,
            locale: options.locale,
            travelStart: options.travelStart,
            travelEnd: options.travelEnd,
            dayStartTime: options.dayStartTime,
            scheduleAssignments: options.scheduleAssignments,
            selectedPlaceIds: options.selectedPlaceIds,
          },
          origin: { label: options.originLabel },
        },
      });
      if (!data.url) throw new Error("공유 링크를 만들지 못했습니다.");
      setShareUrl(data.url);
      setShareState("idle");
      return data.url;
    })();
    pendingShare.current = request;
    try {
      return await request;
    } catch (error) {
      setShareState("error");
      throw error;
    } finally {
      pendingShare.current = null;
    }
  }, [options, shareUrl]);

  const sharePlan = useCallback(async () => {
    try {
      const url = await ensureShareUrl();
      await navigator.clipboard?.writeText(url);
      setShareState("done");
    } catch {
      setShareState("error");
    }
  }, [ensureShareUrl]);

  return { shareState, shareUrl, sharePlan, ensureShareUrl };
}
