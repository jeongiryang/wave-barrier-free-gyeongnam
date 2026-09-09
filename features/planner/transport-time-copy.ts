export function arrivalTime(minutes: number | null, english: boolean) {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return english ? "Arrival time unknown" : "도착시간 미확인";
  if (minutes === 0) return english ? "At retrieval: less than 1 min" : "조회 당시 1분 미만";
  return english ? "At retrieval: " + minutes + " min" : "조회 당시 " + minutes + "분";
}

export function remainingStops(stops: number | null, english: boolean) {
  if (stops === null || !Number.isFinite(stops) || stops < 0) return english ? "Remaining stops unknown" : "남은 정류장 수 미확인";
  return english ? `At retrieval: ${stops} ${stops === 1 ? "stop" : "stops"} away` : "조회 당시 " + stops + "개 정류장 전";
}
