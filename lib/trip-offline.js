import { budgetSummaryLines } from './trip-budget.js';
const text = (value, limit = 2000) => typeof value === 'string' ? value.slice(0, limit).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') : '';
export const escapeOffline = value => text(value, 12000).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const validTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '조회 시각 미확인';
export function offlineTripText({ title, schedule, info = {}, savedAt = new Date().toISOString(), progress = {}, budget, splitLines = [] }) {
  const lines = ['WAVE · ' + text(title, 100), `저장 ${validTimestamp(savedAt)}`, '이 파일은 저장 당시의 여행 요약입니다. 실시간 교통·운영 변경은 연결된 뒤 다시 확인하세요.', ''];
  for (const { day, entries } of schedule.slice(0, 7)) {
    lines.push(day);
    entries.slice(0, 100).forEach((entry, index) => {
      const place = entry.place, detail = info[place.id]?.id === place.id ? info[place.id] : null;
      const mark = progress[day]?.marks?.[place.id]?.state;
      lines.push(`${index + 1}. ${text(place.name, 100)}${mark === 'done' ? ' · 방문 완료' : mark === 'skipped' ? ' · 건너뜀' : ''}`,
        `${entry.startsAtLabel} – ${entry.endsAtLabel} · 체류 ${entry.visitMinutes}분${entry.breakMinutes ? ` · 휴식 ${entry.breakMinutes}분` : ''}`,
        `이동: ${entry.travelSource === 'route' ? `조회한 경로 ${entry.travelMinutes}분` : entry.travelSource === 'estimate' ? `직선거리 기반 추정 ${entry.travelMinutes}분` : '미확인'}`,
        `주소: ${text(place.address) || '미확인'}`, `출처: ${text(place.source) || '미확인'} · ${validTimestamp(place.checkedAt)}`);
      if (entry.fixedTime) lines.push(`고정 시각: ${entry.fixedTime}${entry.lateMinutes ? ` · 계획상 ${entry.lateMinutes}분 늦음` : ''}`);
      lines.push('편의 정보');
      const facilities = Array.isArray(place.accessibility) ? place.accessibility.slice(0, 20) : [];
      if (!facilities.length) lines.push('시설 정보 미확인');
      for (const facility of facilities) lines.push(`${text(facility.label, 80)}: ${{ confirmed: '확인됨', negative: '조건과 맞지 않음' }[facility.state] || '미확인'} · ${text(facility.detail) || '상세 미확인'}`);
      lines.push(`문의처: ${text(detail?.phone, 200) || '미확인'}`, `이용시간: ${text(detail?.hours) || '미확인'}`, `휴무: ${text(detail?.restDays) || '미확인'}`, `이용요금: ${text(detail?.fees) || '미확인'}`);
      if (detail) lines.push(`이용정보 출처: ${text(detail.source)} · ${validTimestamp(detail.checkedAt)}`);
      lines.push('');
    });
  }
  if (budget) lines.push(...budgetSummaryLines(budget));
  if (Array.isArray(splitLines)) lines.push(...splitLines.slice(0, 280).map(line => text(line, 2000)));
  return lines.join('\n');
}
export function offlineTripHtml(input) {
  const paragraphs = offlineTripText(input).split('\n').map((line,index) => {
    const tag = index === 0 ? 'h1' : /^\d{4}-\d{2}-\d{2}$/.test(line) ? 'h2' : /^\d{1,2}\. /.test(line) ? 'h3' : line === '편의 정보' ? 'h4' : 'p';
    return line ? `<${tag}>${escapeOffline(line)}</${tag}>` : '<hr>';
  }).join('');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>WAVE 여행 요약</title><style>body{margin:0;background:#f4f3f8;color:#292531;font:16px/1.65 system-ui,sans-serif}main{box-sizing:border-box;max-width:880px;margin:32px auto;padding:32px;background:white;border-radius:24px}h1,h2{color:#6942a8}h2{margin-top:48px}h3{font-size:22px}p,h1,h2,h3{overflow-wrap:anywhere;white-space:pre-wrap;margin:.6em 0}hr{border:0;border-top:1px solid #ddd6e8;margin:24px 0}@media(max-width:600px){main{margin:0;padding:20px;border-radius:0}}@media print{body{background:white}main{margin:0;padding:0}p{break-inside:avoid}h2,h3,h4{break-after:avoid}}</style></head><body><main>${paragraphs}</main></body></html>`;
}
