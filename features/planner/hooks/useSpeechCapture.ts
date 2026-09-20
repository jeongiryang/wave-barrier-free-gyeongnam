"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendFinalText,
  speechCaptureSupported,
  type SpeechCaptureError,
  type SpeechCaptureState,
} from "../../../lib/speech-capture.js";

type SpeechResult = { isFinal: boolean; 0?: { transcript?: string } };
type SpeechRecognitionEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechRecognitionErrorEvent = { error?: string };
type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognition;

const initialState = (): SpeechCaptureState => ({
  supported: speechCaptureSupported(),
  listening: false,
  finalText: "",
  interimText: "",
  error: null,
});

function errorKind(value?: string): SpeechCaptureError {
  if (value === "not-allowed" || value === "service-not-allowed") return "permission-denied";
  if (value === "no-speech") return "no-speech";
  if (value === "network") return "network";
  if (value === "aborted") return "aborted";
  return "unknown";
}

export function useSpeechCapture() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [state, setState] = useState<SpeechCaptureState>(initialState);

  const detachAndStop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try { recognition.stop(); } catch { /* The browser may already have stopped it. */ }
  }, []);

  const stop = useCallback(() => {
    detachAndStop();
    setState(current => ({ ...current, listening: false, interimText: "" }));
  }, [detachAndStop]);

  const clear = useCallback(() => {
    setState(current => ({ ...current, finalText: "", interimText: "" }));
  }, []);

  const reset = useCallback(() => {
    detachAndStop();
    setState({ supported: speechCaptureSupported(), listening: false, finalText: "", interimText: "", error: null });
  }, [detachAndStop]);

  const start = useCallback(() => {
    if (recognitionRef.current || !speechCaptureSupported()) {
      if (!speechCaptureSupported()) setState(current => ({ ...current, supported: false, error: "not-supported" }));
      return;
    }
    const provider = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const Recognition = provider.SpeechRecognition || provider.webkitSpeechRecognition;
    if (!Recognition) return;
    let recognition: SpeechRecognition;
    try { recognition = new Recognition(); }
    catch {
      setState(current => ({ ...current, listening: false, error: "unknown" }));
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      if (recognitionRef.current === recognition) setState(current => ({ ...current, listening: true, error: null }));
    };
    recognition.onresult = event => {
      if (recognitionRef.current !== recognition) return;
      let finalAddition = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() || "";
        if (!transcript) continue;
        if (result.isFinal) finalAddition = appendFinalText(finalAddition, transcript, 2000);
        else interimText = appendFinalText(interimText, transcript, 2000);
      }
      setState(current => ({
        ...current,
        finalText: finalAddition ? appendFinalText(current.finalText, finalAddition, 2000) : current.finalText,
        interimText,
      }));
    };
    recognition.onerror = event => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      setState(current => ({ ...current, listening: false, interimText: "", error: errorKind(event.error) }));
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      setState(current => ({ ...current, listening: false, interimText: "" }));
    };
    setState(current => ({ ...current, listening: false, error: null }));
    try { recognition.start(); }
    catch {
      detachAndStop();
      setState(current => ({ ...current, listening: false, error: "unknown" }));
    }
  }, [detachAndStop]);

  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      detachAndStop();
    };
  }, [detachAndStop, stop]);

  return { state, start, stop, clear, reset };
}
