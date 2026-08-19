import type { RouteAlternative } from "../routing/types";

export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateRange(start: string, end: string) {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || first > last) return [start];
  const days: string[] = [];
  for (let current = first; current <= last && days.length < 7; current = new Date(current.getTime() + 86400000)) {
    days.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`);
  }
  return days;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function routeModeLabel(route: RouteAlternative) {
  if (!route.configured) return "직선 위치 미리보기";
  if (route.mode === "car") return "자동차 경로";
  if (route.mode === "train") return "기차·철도 경로";
  if (route.mode === "bus" || route.mode === "transit") return "대중교통 경로";
  if (route.mode === "walk") return "도보 경로";
  if (route.mode === "bicycle") return "자전거 경로";
  return "이동 경로";
}
