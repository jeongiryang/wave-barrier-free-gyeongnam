"use client";

import { useCallback, useState } from "react";
import { plannerJson } from "../services/api";
import type { Place, PlanData } from "../types";

type ShareState = "idle" | "saving" | "done" | "error";
type FeedbackState = "idle" | "sending" | "done" | "error";

interface PlannerParticipationOptions {
  plan: PlanData | null;
  region: string;
  theme: string;
  profiles: string[];
  locale: string;
  travelStart: string;
  travelEnd: string;
  scheduleAssignments: Record<string, string>;
  selectedPlaceIds: string[];
  originLabel: string;
  selectedPlace: Place | null;
}

export function usePlannerParticipation({
  plan,
  region,
  theme,
  profiles,
  locale,
  travelStart,
  travelEnd,
  scheduleAssignments,
  selectedPlaceIds,
  originLabel,
  selectedPlace,
}: PlannerParticipationOptions) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");

  const changeFeedbackText = useCallback((value: string) => {
    setFeedbackText(value);
    setFeedbackState("idle");
  }, []);

  const sharePlan = useCallback(async () => {
    if (!plan || shareState === "saving") return;
    setShareState("saving");
    try {
      const data = await plannerJson<{ url?: string }>("/api/trips", {
        method: "POST",
        body: {
          plan,
          selections: {
            region,
            theme,
            profiles,
            locale,
            travelStart,
            travelEnd,
            scheduleAssignments,
            selectedPlaceIds,
          },
          origin: { label: originLabel },
        },
      });
      if (!data.url) throw new Error("공유 링크를 만들지 못했습니다.");
      setShareUrl(data.url);
      setShareState("done");
      await navigator.clipboard?.writeText(data.url);
    } catch {
      setShareState("error");
    }
  }, [locale, originLabel, plan, profiles, region, scheduleAssignments, selectedPlaceIds, shareState, theme, travelEnd, travelStart]);

  const submitFeedback = useCallback(async () => {
    if (!selectedPlace || feedbackText.trim().length < 5 || feedbackState === "sending") return;
    setFeedbackState("sending");
    try {
      await plannerJson<{ ok?: boolean }>("/api/feedback", {
        method: "POST",
        body: {
          placeId: selectedPlace.id,
          placeName: selectedPlace.name,
          field: "접근성 정보",
          message: feedbackText,
        },
      });
      setFeedbackText("");
      setFeedbackState("done");
    } catch {
      setFeedbackState("error");
    }
  }, [feedbackState, feedbackText, selectedPlace]);

  return {
    shareState,
    shareUrl,
    feedbackText,
    feedbackState,
    changeFeedbackText,
    sharePlan,
    submitFeedback,
  };
}
