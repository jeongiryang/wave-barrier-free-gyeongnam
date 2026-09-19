export type HapticSignal = "confirm" | "alert";

export function hapticsSupported(): boolean;
export function hapticPattern(signal: HapticSignal): number[];
/** enabled 가 false 이거나 미지원이면 아무 것도 하지 않고 false 를 돌려준다. */
export function vibrate(signal: HapticSignal, enabled: boolean): boolean;
