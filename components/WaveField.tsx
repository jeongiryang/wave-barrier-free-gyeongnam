"use client";

import { useWaveFieldRenderer } from "../features/motion/useWaveFieldRenderer";
import { useSitePreferences } from "./SitePreferences";

export type WaveFieldProps = {
  /** deep: 어두운 심해 배경. light: 연한 수면 배경. */
  tone?: "deep" | "light";
  /** intro면 물결 위로 형상이 차례로 떠오른다. */
  mode?: "intro" | "ambient";
  /** 마지막에 떠오를 글자. */
  wordmark?: string;
  className?: string;
  replay?: number;
};

export default function WaveField({
  tone = "deep",
  mode = "ambient",
  wordmark = "W.A.V.E",
  className,
  replay = 0,
}: WaveFieldProps) {
  const { motion } = useSitePreferences();
  const canvasRef = useWaveFieldRenderer({ tone, mode, wordmark, motion }, replay);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
