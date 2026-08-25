"use client";

import { useEffect, useRef } from "react";
import {
  startWaveFieldRenderer,
  type WaveFieldRendererOptions,
} from "./wave-field-engine";

export function useWaveFieldRenderer(options: WaveFieldRendererOptions) {
  const { mode, motion, tone, wordmark } = options;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startWaveFieldRenderer(canvas, { mode, motion, tone, wordmark });
  }, [mode, motion, tone, wordmark]);

  return canvasRef;
}
