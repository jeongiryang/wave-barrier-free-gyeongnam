/* 획이 많은 글자는 잔상을 남기므로 점과 선 중심의 낮은 밀도로 쌓는다. */
export const WAVE_RAMP = [" ", "·", "·", ":", ":", "-", "-", "~", "~", "="];

const DEEP_TINTS = [
  "#0a3a52", "#0d4a68", "#12587f", "#166b95", "#1a80a8",
  "#2496b8", "#3aabc4", "#5cc2cf", "#86d6d8", "#b3e5e2",
];

const LIGHT_TINTS = [
  "#e0eef6", "#d0e4f0", "#bcd8e9", "#a5cade", "#8bbad2",
  "#71a9c5", "#5a97b6", "#4785a6", "#387395", "#2c6383",
];

export function wavePalette(tone: "deep" | "light") {
  return tone === "deep"
    ? { tints: DEEP_TINTS, background: "#04202f" }
    : { tints: LIGHT_TINTS, background: "#eef7fc" };
}

/* 문자 열 단계로 양자화되는 파형은 sin 룩업 테이블로 계산량을 제한한다. */
const SIN_STEPS = 4096;
const SIN_MASK = SIN_STEPS - 1;
const SIN_SCALE = SIN_STEPS / (Math.PI * 2);
const SIN_TABLE = new Float32Array(SIN_STEPS);
for (let index = 0; index < SIN_STEPS; index += 1) {
  SIN_TABLE[index] = Math.sin((index / SIN_STEPS) * Math.PI * 2);
}

export const fastSin = (value: number) => SIN_TABLE[((value * SIN_SCALE) | 0) & SIN_MASK];

export type Wave = {
  k: number;
  speed: number;
  amp: number;
  dirX: number;
  dirY: number;
  phase: number;
};

export const WAVES: Wave[] = [
  { k: 0.055, speed: 0.72, amp: 1.0, dirX: 0.99, dirY: 0.14, phase: 0 },
  { k: 0.091, speed: 1.0, amp: 0.62, dirX: 0.94, dirY: -0.34, phase: 1.7 },
  { k: 0.148, speed: 1.4, amp: 0.34, dirX: 0.86, dirY: 0.51, phase: 3.1 },
  { k: 0.233, speed: 1.92, amp: 0.18, dirX: 0.99, dirY: -0.12, phase: 5.4 },
];

export const INTRO_STAGES = [
  { in: [0.1, 0.4], out: [0.56, 0.76] },
  { in: [0.58, 0.86], out: [1.02, 1.2] },
  { in: [1.02, 1.28], out: [1.78, 1.96] },
];

export function stageWeight(time: number, stage: { in: number[]; out: number[] }) {
  const [inStart, inEnd] = stage.in;
  const [outStart, outEnd] = stage.out;
  if (time <= inStart || time >= outEnd) return 0;
  if (time < inEnd) return (time - inStart) / (inEnd - inStart);
  if (time <= outStart) return 1;
  return 1 - (time - outStart) / (outEnd - outStart);
}

export type Ripple = { x: number; y: number; born: number };
