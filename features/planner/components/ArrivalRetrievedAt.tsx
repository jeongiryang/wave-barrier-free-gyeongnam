export default function ArrivalRetrievedAt({ value, english }: { value?: string | null; english: boolean }) {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return <small>{english ? "Retrieval time unavailable" : "조회 시각 미확인"}</small>;
  const label = new Intl.DateTimeFormat(english ? "en-GB" : "ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
  return <small>{english ? "WAVE retrieved " : "WAVE 조회 "}<time dateTime={value!}>{label} KST</time></small>;
}
