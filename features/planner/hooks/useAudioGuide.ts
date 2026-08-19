"use client";

import { useCallback, useRef, useState, type SyntheticEvent } from "react";
import type { PlanData } from "../types";

export function useAudioGuide(audio: PlanData["audio"] | null | undefined) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const resetAudio = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setAudioProgress(0);
    setAudioTime(0);
    setAudioDuration(0);
    setTranscriptOpen(false);
  }, []);

  const toggleAudio = useCallback(async () => {
    const element = audioRef.current;
    if (!element || !audio?.audioUrl) {
      setTranscriptOpen(true);
      return;
    }
    if (element.paused) await element.play();
    else element.pause();
  }, [audio?.audioUrl]);

  const seekAudio = useCallback((seconds: number) => {
    const element = audioRef.current;
    if (!element) return;
    const duration = Number.isFinite(element.duration) ? element.duration : Number.MAX_SAFE_INTEGER;
    element.currentTime = Math.max(0, Math.min(element.currentTime + seconds, duration));
  }, []);

  const handleLoadedMetadata = useCallback((event: SyntheticEvent<HTMLAudioElement>) => {
    setAudioDuration(event.currentTarget.duration || 0);
  }, []);

  const handleTimeUpdate = useCallback((event: SyntheticEvent<HTMLAudioElement>) => {
    const element = event.currentTarget;
    setAudioTime(element.currentTime);
    setAudioProgress(element.duration ? (element.currentTime / element.duration) * 100 : 0);
  }, []);

  return {
    audioRef,
    transcriptOpen,
    playing,
    audioProgress,
    audioTime,
    audioDuration,
    toggleTranscript: () => setTranscriptOpen((current) => !current),
    toggleAudio,
    seekAudio,
    handleLoadedMetadata,
    handleTimeUpdate,
    handlePlay: () => setPlaying(true),
    handlePause: () => setPlaying(false),
    resetAudio,
  };
}
