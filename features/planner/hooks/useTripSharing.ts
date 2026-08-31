"use client";

import { useCallback, useState } from "react";
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
  const sharePlan = useCallback(async () => {
    if (!options.plan || shareState === "saving") return;
    setShareState("saving");
    try {
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
      setShareState("done");
      await navigator.clipboard?.writeText(data.url);
    } catch {
      setShareState("error");
    }
  }, [options, shareState]);

  return { shareState, shareUrl, sharePlan };
}
