export function previousMonth(offset = 2) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function todayYmd() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replaceAll("-", "");
}

export function safeYmd(value: string | null, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? String(value).replaceAll("-", "") : fallback;
}
