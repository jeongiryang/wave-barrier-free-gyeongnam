/** Retrieval timestamps are displayed in the travel destination's time zone. */
export function evidenceDate(value) {
  if (typeof value !== 'string' || !value || !Number.isFinite(Date.parse(value))) return '확인일 미확인';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
