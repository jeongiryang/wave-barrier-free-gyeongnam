import { offsetTripDate } from '../lib/trip-dates.js';
// Synthetic visitor prompts only. Use the same corpus before changing model or GPU allocation.
// Default to local development. WAVE_EVAL_BASE may explicitly target an authorized deployment.
const base = process.env.WAVE_EVAL_BASE || 'http://127.0.0.1:4173';
const today = offsetTripDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), 1);
const venues = [{ id: '1748884', name: '3·15 아트센터', city: '창원' }, { id: '1904774', name: '창원과학체험관', city: '창원' }];
const empty = { region: '', profiles: [], themes: [], start: today, end: today, days: [today], transport: 'car', savedIds: [], places: [], stops: [] };
const existing = { ...empty, region: '창원', profiles: ['wheel'], themes: ['history'], places: venues, savedIds: venues.map(p => p.id), stops: venues.map(p => ({ id: p.id, date: today, fixed: false })) };
const followupHistory = [{ role: 'user', content: '비 오는 날 휠체어로 갈 수 있는 경남 여행 코스 만들어줘.' }, { role: 'assistant', content: '3·15 아트센터와 창원과학체험관의 날짜·순서·체류·휴식을 반영했어요.' }];
const cases = [
  ['general', '경남 당일 여행 코스를 만들어줘. 자동차로 이동해.', empty, ['create-itinerary']],
  ['wheel', '비 오는 날 휠체어로 갈 수 있는 경남 당일 여행 코스 만들어줘. 자동차로 이동할 거야.', empty, ['create-itinerary'], 'wheel'],
  ['senior', '부모님이 오래 걷기 힘들어. 창원에서 출발해서 당일치기로 여행하고 싶어.', empty, ['create-itinerary'], 'senior'],
  ['pregnant', '임산부와 함께 창원 여행 코스를 만들어줘. 중간에 자주 쉬고 싶어.', empty, ['create-itinerary'], 'pregnant'],
  ['baby', '아기와 유모차로 김해 당일 여행 코스 만들어줘. 자동차야.', empty, ['create-itinerary'], 'baby'],
  ['visual', '시각장애가 있는 동행과 진주 여행을 가려고 해. 안내 편의를 확인해서 코스 만들어줘.', empty, ['create-itinerary'], 'visual'],
  ['hearing', '청각장애가 있어. 경남 여행 코스와 문자 안내 편의를 확인해줘.', empty, ['create-itinerary'], 'hearing'],
  ['rain', '창원에 비가 온대. 지금 일정에서 실내 장소로 바꾸는 안을 만들어줘.', existing, ['adapt-itinerary']],
  ['festival', '아이와 갈 만한 경남 축제랑 주변 장소로 당일 코스를 만들어줘.', empty, ['create-itinerary'], 'baby', [], { reason: undefined }],
  ['multiday', `${offsetTripDate(today, 6)}부터 ${offsetTripDate(today, 8)}까지 창원 2박 3일 코스를 만들어줘.`, empty, ['create-itinerary']],
  ['adapt', '좀 피곤해. 현재 일정에서 덜 걷고 더 쉬도록 바꿔줘.', existing, ['adapt-itinerary']],
  ['delete', '현재 일정에서 창원과학체험관을 빼줘.', existing, ['remove']],
  ['empty', '조건에 맞는 검색 결과가 하나도 없어. 필요한 휠체어 편의는 유지하고 경남 전체에서 대안을 찾아 코스를 만들어줘.', existing, ['create-itinerary','adapt-itinerary']],
  ['api-failure', '날씨 제공처에 연결되지 않는다고 떠. 지금 일정을 잃지 않고 어떻게 계속하면 돼?', existing, ['help','tool','readiness']],
  ['followup-transport', '자동차로 이동할게.', { ...existing, transport: 'transit' }, ['recalculate-route'], undefined, followupHistory, { transport: 'car' }],
  ['followup-dates', '여행 날짜만 내일로 바꿔줘.', existing, ['set-dates'], undefined, followupHistory, { start: today, end: today }],
  ['followup-start', '출발 시각만 오전 11시로 바꿔줘.', existing, ['start-time'], undefined, followupHistory, { time: '11:00' }],
  ['followup-break', '3·15 아트센터에서 쉬는 시간만 30분으로 바꿔줘.', existing, ['break'], undefined, followupHistory, { placeId: '1748884', minutes: 30 }],
  ['followup-remove', '일정의 두 번째 장소를 빼줘.', existing, ['remove'], undefined, followupHistory, { placeId: '1904774' }],
];
const results = [];
for (const [category, prompt, context, expected, profile, history = [], fields = {}] of cases) {
  if (process.argv[2] && !process.argv[2].split(',').includes(category)) continue;
  const started = Date.now();
  try {
    const response = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ messages: [...history, { role: 'user', content: prompt }], context: { ...context, profiles: context.profiles.join(','), themes: context.themes.join(',') } }), signal: AbortSignal.timeout(50000) });
    const answer = await response.json();
    const result = { category, prompt, status: response.status, intentMs: Date.now() - started, answer, intentPass: Boolean(response.ok && expected.includes(answer.proposal?.action) && (!profile || answer.proposal?.profiles?.includes(profile)) && Object.entries(fields).every(([key, value]) => answer.proposal?.[key] === value)) };
    if (['create-itinerary','adapt-itinerary'].includes(answer.proposal?.action)) {
      const journeyStart = Date.now();
      const prepared = await fetch(`${base}/api/assistant/journey`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ action: answer.proposal, context }), signal: AbortSignal.timeout(45000) });
      const events = (await prepared.text()).trim().split('\n').map(line => JSON.parse(line));
      const draft = events.find(e => e.type === 'result')?.draft;
      result.journey = { status: prepared.status, ms: Date.now() - journeyStart, error: events.find(e => e.type === 'error'), region: draft?.region, days: draft?.days, stops: draft?.stops.map(s => ({ id: s.place.id, name: s.place.name, date: s.date, unknown: s.unknown, reasons: s.reasons })), warnings: draft?.warnings, restOnly: draft?.restOnly, removed: draft?.removed };
    }
    results.push(result);
    console.log(JSON.stringify({ category, status: result.status, intentMs: result.intentMs, intentPass: result.intentPass, proposal: answer.proposal, journey: result.journey }));
  } catch (error) { const result = { category, prompt, error: String(error), ms: Date.now() - started }; results.push(result); console.log(JSON.stringify(result)); }
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 6200 - (Date.now() - started))));
}
if (results.some(result => result.error || !result.intentPass || result.journey?.error)) process.exitCode = 1;
