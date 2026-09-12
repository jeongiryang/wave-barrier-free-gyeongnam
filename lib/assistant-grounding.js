import { offsetTripDate, validTripDate } from './trip-dates.js';

function requestedTransport(turns) {
  const aliases = /자동차|승용차|렌[터트]카|차로|자가용|대중교통|버스|기차|전철|지하철|도보|걸어서|자전거|\b(?:car|train|transit|walk|bicycle)\b/gi;
  for (const turn of [...turns].reverse()) {
    const mentioned = [...turn.matchAll(aliases)];
    const matches = mentioned.filter(match => !/^(?:는|은|로는|를|을)?\s*(?:안|빼|제외|말고|타지|않)/.test(turn.slice(match.index + match[0].length)));
    if (!matches.length) { if (mentioned.length) return undefined; continue; }
    const word = matches.at(-1)[0];
    return /자전거|bicycle/i.test(word) ? 'bicycle' : /도보|걸어서|walk/i.test(word) ? 'walk' : /대중교통|버스|기차|전철|지하철|train|transit/i.test(word) ? 'transit' : 'car';
  }
}

function calendarDates(turn, context) {
  const iso = [...turn.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map(match => match[0]).filter(validTripDate);
  if (iso.length) return [iso[0], iso.at(-1)];
  const reference = context.days?.[0] || context.today;
  if (!validTripDate(reference)) return null;
  let year = reference.slice(0, 4), month = reference.slice(5, 7);
  const dates = [];
  const hasMonth = /\d{1,2}\s*월/.test(turn);
  for (const match of turn.matchAll(/(?:(\d{4})\s*년\s*)?(?:(\d{1,2})\s*월\s*)?(\d{1,2})\s*일/g)) {
    const after = turn.slice(match.index + match[0].length);
    if ((!hasMonth && !/^(?:에|부터|까지)/.test(after)) || !match[2] && /^\s*(?:동안|간|코스|일정|여행)/.test(after)) continue;
    year = match[1] || year; month = match[2]?.padStart(2, '0') || month;
    const date = `${year}-${month}-${match[3].padStart(2, '0')}`;
    if (validTripDate(date)) dates.push(date);
  }
  if (dates.length) return [dates[0], dates.at(-1)];
  const short = [...turn.matchAll(/\b(\d{1,2})[./](\d{1,2})\b/g)].map(match => `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`).filter(validTripDate);
  if (short.length) return [short[0], short.at(-1)];
  const today = validTripDate(context.today) ? context.today : reference;
  if (/오늘|today/i.test(turn)) return [today, today];
  if (/모레/.test(turn)) { const date = offsetTripDate(today, 2); return [date, date]; }
  if (/내일|tomorrow/i.test(turn)) { const date = offsetTripDate(today, 1); return [date, date]; }
  if (/주말|weekend/i.test(turn)) {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    const mondayIndex = (weekday + 6) % 7;
    if (!/다음|next/i.test(turn) && weekday === 0) return [today, today];
    const saturday = offsetTripDate(today, /다음|next/i.test(turn) ? 12 - mondayIndex : 5 - mondayIndex);
    return [saturday, /당일|day.trip/i.test(turn) ? saturday : offsetTripDate(saturday, 1)];
  }
  const weekdays = [...turn.matchAll(/([월화수목금토일])요일/g)].map(match => '월화수목금토일'.indexOf(match[1]));
  if (weekdays.length) {
    const index = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
    const shift = /다다음\s*주/.test(turn) ? 14 - index : /다음\s*주/.test(turn) ? 7 - index : /이번\s*주/.test(turn) ? -index : -index + (weekdays[0] < index ? 7 : 0);
    const first = offsetTripDate(today, shift + weekdays[0]);
    return [first, offsetTripDate(first, (weekdays.at(-1) - weekdays[0] + 7) % 7)];
  }
  return null;
}

/** Optional model fields must be grounded in the visitor's words, never schema defaults. */
export function groundAssistantProposal(value, messages, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const action = { ...value };
  if (!['create-itinerary', 'adapt-itinerary'].includes(action.action)) return action;
  const turns = messages.filter(item => item.role === 'user').map(item => item.content);
  const said = turns.join(' ');
  const latest = turns.at(-1) || '';
  const festivalTurn = [...turns].reverse().find(turn => /축제|행사|festival|event/i.test(turn) || (action.festival && action.festival !== 'any' && turn.includes(action.festival)));
  if (!festivalTurn || /(?:축제|행사)(?:는|를|도)?\s*(?:빼|제외|말고|없이|안)/.test(festivalTurn)) delete action.festival;
  else if (action.festival && action.festival !== 'any' && !festivalTurn.replace(/\s/g, '').includes(action.festival.replace(/\s/g, ''))) action.festival = 'any';
  if (typeof action.originRegion === 'string') {
    const region = action.originRegion;
    const originTurn = [...turns].reverse().find(turn => /출발|떠나|from/i.test(turn)) || '';
    const linkedOrigin = new RegExp(`(?:${region}(?:시|군)?(?:중앙)?(?:역)?(?:에서|을|를)?\\s*(?:출발|떠나)|출발지(?:는|를|가|:)?\\s*${region}|from\\s+${region})`, 'i');
    if (!region || !linkedOrigin.test(originTurn)) delete action.originRegion;
  }
  const transport = requestedTransport(turns);
  if (transport) action.transport = transport;
  else delete action.transport;
  if (/부모님|어르신|고령|노인/.test(said) && /걷.{0,8}(?:어렵|어려|힘|부담)|적게\s*걷|무릎.{0,8}(?:아프|불편)|자주\s*쉬|쉬엄쉬엄|휴식.{0,8}(?:필요|넉넉)/.test(said)) action.profiles = [...new Set([...(Array.isArray(action.profiles) ? action.profiles : []), 'senior'])];
  if (context.savedIds?.length && /대안|바꿔|변경|대체/.test(latest) && !/새 여행|새 일정/.test(latest)) action.action = 'adapt-itinerary';
  // An unspecified date keeps the current trip; a duration uses its actual first day.
  const calendarPattern = /\d{1,2}\s*월\s*\d{1,2}\s*일|\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}|\d{1,2}\s*일(?:부터|까지|에)|오늘|내일|모레|(?:이번|다음|다다음)\s*(?:주|달)|주말|[월화수목금토일]요일|today|tomorrow|weekend/i;
  const calendarTurn = [...turns].reverse().find(turn => calendarPattern.test(turn));
  const hasCalendarDate = Boolean(calendarTurn);
  if (calendarTurn) {
    const dates = calendarDates(calendarTurn, context);
    if (dates) { action.start = dates[0]; action.end = dates[1]; }
    else { delete action.start; delete action.end; }
  }
  if (!hasCalendarDate || /당일|day.trip|(?:\d\s*박\s*)?[1-7]\s*일\s*(?:여행|동안|코스|일정|간|정도|$)/i.test(latest) && !calendarPattern.test(latest)) {
    delete action.start; delete action.end;
    const first = context.days?.[0];
    const duration = latest.match(/(?:\d\s*박\s*)?([1-7])\s*일\s*(?:여행|동안|코스|일정|간|정도|$)/);
    if (validTripDate(first) && (duration || /당일|day.trip/i.test(latest) && context.days.length > 1)) {
      action.start = first; action.end = offsetTripDate(first, duration ? Number(duration[1]) - 1 : 0);
    }
  }
  // A target day is distinct from the whole trip's dates. Do not invent one.
  if (!calendarPattern.test(latest)) {
    delete action.date;
    const ordinal = latest.match(/(첫|둘째|셋째|넷째|다섯째|여섯째|일곱째|[1-7])\s*(?:째\s*)?날/);
    if (ordinal) {
      const day = ['첫','둘째','셋째','넷째','다섯째','여섯째','일곱째'].indexOf(ordinal[1]);
      const target = context.days?.[day >= 0 ? day : Number(ordinal[1]) - 1];
      if (validTripDate(target)) action.date = target;
    }
  }
  else if (action.date && action.date !== action.start && action.date !== action.end) delete action.date;
  return action;
}
