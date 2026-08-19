"use client";

import { useCallback, useState } from "react";
import { plannerJson } from "../services/api";
import type { Place } from "../types";

export function useAccessibilityFeedback(selectedPlace: Place | null) {
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const changeFeedbackText = useCallback((value: string) => {
    setFeedbackText(value);
    setFeedbackState("idle");
  }, []);
  const submitFeedback = useCallback(async () => {
    if (!selectedPlace || feedbackText.trim().length < 5 || feedbackState === "sending") return;
    setFeedbackState("sending");
    try {
      await plannerJson<{ ok?: boolean }>("/api/feedback", {
        method: "POST",
        body: { placeId: selectedPlace.id, placeName: selectedPlace.name, field: "접근성 정보", message: feedbackText },
      });
      setFeedbackText("");
      setFeedbackState("done");
    } catch {
      setFeedbackState("error");
    }
  }, [feedbackState, feedbackText, selectedPlace]);
  return { feedbackText, feedbackState, changeFeedbackText, submitFeedback };
}
