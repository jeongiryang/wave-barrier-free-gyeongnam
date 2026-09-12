import { boundedTripEnd, offsetTripDate, validTripDate } from './trip-dates.js';
import { GYEONGNAM_REGION_POINTS } from './gyeongnam-regions.js';

const namedRegions = Object.keys(GYEONGNAM_REGION_POINTS).filter(region => region !== '경남 전체');

function nearbyDayTripOrigin(action, turns, context) {
  // This is a search default for a new, low-burden day trip, not a claim about
  // route duration/accessibility or permission to move an existing itinerary.
  if (action.action !== 'create-itinerary' || context.savedIds?.length || context.stops?.length) return undefined;
  const latest = turns.at(-1) || '';
  const start = action.start || context.days?.[0] || context.today;
  const end = action.end || context.days?.at(-1) || start;
  if (!validTripDate(start) || start !== end || /[1-9]\s*박|[2-9]\s*일\s*(?:간|동안|여행|일정|코스)|여러\s*날|multi.day/i.test(latest)) return undefined;
  if (!/걷.{0,8}(?:어렵|어려|힘|부담)|(?:적게|덜)\s*걷|무릎.{0,8}(?:아프|불편)|자주\s*쉬|쉬엄쉬엄|여유롭|여유롭게|휴식.{0,8}(?:필요|넉넉)|이동.{0,8}(?:부담|줄)/.test(latest)
    || /걷.{0,15}(?:않|아니)|여유롭게.{0,8}(?:않|말)|[?？]/.test(latest)) return undefined;
  const origins = namedRegions.filter(region => new RegExp(`(?:(?:^|[^가-힣A-Za-z0-9])${region}(?:시|군)?(?:중앙)?(?:역)?에서\\s*(?:출발|떠나)(?!\\s*(?:하지|하진|안))|출발지(?:는|를|가|:)?\\s*${region}(?![^,.!?]{0,8}(?:아니|말고)))`).test(latest));
  if (origins.length !== 1) return undefined;
  const origin = origins[0];
  if (context.region && context.region !== '경남 전체' && context.region !== origin) return undefined;
  const said = turns.join(' ');
  // A named destination (including one outside WAVE's service area) is not an
  // unspecified destination. Never replace it with this convenience default.
  if (/(?:^|[^가-힣])(?:부산|서울|인천|대구|대전|광주|울산|세종|제주|경기|강원|충청|충북|충남|전라|전북|전남|경북|경상북|해외)(?:특별자치)?(?:시|도)?(?:에서|으로|로|에|의|을|를|은|는)?(?=\s|[,.!?。！？]|$)/.test(said)) return null;
  if (namedRegions.some(region => region !== origin && said.includes(region))
    || /다른\s*(?:지역|도시)|멀리|경남\s*전체.{0,12}(?:넓혀|넓게)/.test(said)
    || action.festival && action.festival !== 'any') return undefined;
  const targets = [...said.matchAll(/([가-힣A-Za-z0-9·]+?)(?:으로|로|에)\s*(?:(?:당일치기|당일|하루)\s*)?(?:가고|갈|여행|방문|둘러)/g)].map(match => match[1]);
  const nonDestinations = /^(?:당일치기|당일|하루|주말|오늘|내일|모레|자동차|차|승용차|대중교통|도보|자전거|휠체어|유모차|경남|[1-7]일)$/;
  if (targets.some(target => target !== origin && !nonDestinations.test(target))) return undefined;
  return origin;
}

function transportOnlyRequest(text) {
  const turn = text.trim().replace(/[.!。！]+$/, '').trim();
  const mode = '(자동차|승용차|자가용|렌[터트]카|차|대중교통|버스|기차|전철|지하철|도보|자전거)';
  const prefix = '(?:(?:그럼|그러면|이번에는|이제|앞으로)\\s*)?(?:(?:이동수단|교통수단|이동)(?:은|는|을|를)?\\s*)?';
  const decision = '(?:(?:이동|여행|이용)?\\s*할(?:게(?:요)?|\\s*거(?:야|예요))|갈게(?:요)?|가겠(?:어(?:요)?|습니다)|(?:바꿔|변경해|설정해|해)\\s*(?:줘|주세요)|(?:이동|이용)해\\s*줘)';
  const match = turn.match(new RegExp(`^${prefix}${mode}(?:으)?로\\s*${decision}$`));
  if (match) return requestedTransport([match[1] === '차' ? '자동차' : match[1]]);
  if (/^(?:그럼\s*)?(?:걸어서\s*(?:이동할게(?:요)?|갈게(?:요)?)|걸을게(?:요)?)$/.test(turn)) return 'walk';
  const english = turn.match(/^(?:please\s+)?(?:change\s+(?:(?:the|my)\s+)?(?:transport|travel\s+mode)\s+to|switch\s+to|use|(?:i'll|i\s+will)\s+(?:travel|go)\s+by)\s+(car|public\s+transport|transit|bus|train|bicycle|bike|walking|foot)(?:\s+please)?$/i);
  if (english) return /bicycle|bike/i.test(english[1]) ? 'bicycle' : /walking|foot/i.test(english[1]) ? 'walk' : /car/i.test(english[1]) ? 'car' : 'transit';
}

function requestedTransport(turns) {
  const aliases = /자동차|승용차|렌[터트]카|(?<![가-힣])차로|자가용|대중교통|버스|기차|전철|지하철|도보|걸어서|자전거|\b(?:car|train|transit|walk|bicycle)\b/gi;
  for (const turn of [...turns].reverse()) {
    const mentioned = [...turn.matchAll(aliases)];
    const matches = mentioned.filter(match => !/^(?:는|은|로는|를|을)?\s*(?:안|빼|제외|말고|타지|않)/.test(turn.slice(match.index + match[0].length)));
    if (!matches.length) { if (mentioned.length) return undefined; continue; }
    const word = matches.at(-1)[0];
    return /자전거|bicycle/i.test(word) ? 'bicycle' : /도보|걸어서|walk/i.test(word) ? 'walk' : /대중교통|버스|기차|전철|지하철|train|transit/i.test(word) ? 'transit' : 'car';
  }
}

function requestedBabyFacilities(turns) {
  for (const turn of [...turns].reverse()) {
    // A later exclusion or a different party stops inheritance from an old trip.
    if (/(?:아이들?|아기|유아|어린이|유모차|수유실|유아\s*편의)(?:와|과|랑|는|은|를|을)?\s*(?:없이|말고|빼|제외|안\s|필요\s*없|동행하지|가지\s*않)|(?:아이들?|아기|유아|어린이)(?:와|과|랑)\s*가지\s*않|성인끼리|어른끼리|혼자\s*(?:갈|가|떠나|여행)|부부끼리|친구끼리|\bwithout\s+(?:(?:my|our|a|the)\s+)?(?:child(?:ren)?|kids?|baby|stroller)|\badults?\s+only\b/i.test(turn)) return false;
    if (/[?？]|(?:까요|나요|할까|어때)\s*[.!。！]*$/.test(turn) && /아이|아기|유아|어린이|유모차|수유|기저귀|\b(?:child|children|kids?|baby|stroller)\b/i.test(turn)) return false;
    if (/(?:^|\s)(?:아이들?|아기|유아|어린이|자녀)(?:(?:와|과|랑|하고)\s|(?:와|과|랑)(?:갈|가|함께)|(?:를|을)?\s*데리고|\s*동행)|(?:^|\s)유모차(?:로|를\s*(?:끌|밀|가지고|가져|이용|사용)|\s*(?:편의|이동|접근))|(?:유아|영유아|아기|어린이)\s*편의|수유실|기저귀\s*교환|\bwith\s+(?:(?:my|our|a|the|two)\s+)?(?:child(?:ren)?|kids?|baby|toddler)|\b(?:child|baby)-friendly\b|\bstroller\b|\bnursing\s+room|\bdiaper\s+chang/i.test(turn)) return true;
    if (/새(?:로운)?\s*(?:여행|일정)|다른\s*동행/.test(turn)) return false;
  }
  return false;
}

function requestedFatigueAdjustment(turn) {
  // Fatigue can remove visits. An old symptom, a question or a negation is not
  // authorization to apply that adaptation to the current request.
  if (/[?？]|(?:까요|나요|할까|어때)\s*[.!。！]*$/.test(turn)) return false;
  if (/안\s*(?:피곤|지치)|(?:피곤|지치|지쳤|쉬고\s*싶)[^,.!?。！？]{0,12}(?:않|아니)|피곤(?:함|감)?(?:이|은|는)?\s*없|휴식(?:이|은|는)?\s*필요\s*없|\bnot\s+(?:tired|exhausted|fatigued)|\b(?:don't|do\s+not)\s+(?:need|want)\s+(?:to\s+)?rest/i.test(turn)) return false;
  return /피곤|지쳤|지쳐|쉬고\s*싶|휴식(?:이|을|은|는)?\s*필요|걷(?:기|는\s*게|는\s*것이)?\s*(?:힘들|힘겨)|\b(?:tired|exhausted|fatigued)|\b(?:need|want)\s+(?:to\s+)?rest/i.test(turn);
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

function dateOnlyRequest(text, context) {
  const turn = text.trim().replace(/[.!。！]+$/, '').trim();
  const subject = '(?:(?:이번|현재)\\s*)?(?:여행\\s*)?(날짜|기간)(?:만|를|을|는|은)?';
  const prefix = '(?:(?:그럼|그러면|이번에는|이제)\\s*)?';
  const command = '(?:바꿔|변경해|설정해|정해|줄여|늘려)\\s*(?:줘|주세요)';
  const forward = turn.match(new RegExp(`^${prefix}${subject}\\s*(.+?)\\s*(?:(?:으)?로)?\\s*${command}$`));
  const reverse = turn.match(new RegExp(`^${prefix}(.+?)(?:으)?로\\s*${subject}\\s*${command}$`));
  const english = turn.match(/^(?:please\s+)?(?:change|set)\s+(?:only\s+)?(?:(?:the|my)\s+)?(?:(?:travel|trip)\s+)?(dates?|period)\s+(?:only\s+)?to\s+(.+?)(?:\s+please)?$/i);
  const kind = forward?.[1] || reverse?.[2] || english?.[1];
  const expression = (forward?.[2] || reverse?.[1] || english?.[2])?.trim();
  if (!expression) {
    // An incomplete, negative or questioning date edit cannot repeat an old trip
    // creation request. Mixed edits need clarification instead of guessing dates.
    if (/(?:날짜|기간)/.test(turn) && /바꿔|바꿀|바꾸|변경|설정|정해|줄여|늘려/.test(turn) || /\b(?:change|set)\b.*\b(?:dates?|period)\b/i.test(turn)) return null;
    return undefined;
  }
  const duration = expression.match(/^(?:(\d+)\s*박\s*)?(\d+)\s*일(?:\s*동안)?$/);
  if (/^당일(?:치기)?$/.test(expression) || duration && /기간|period/i.test(kind)) {
    const start = context.days?.[0] || context.today;
    if (!validTripDate(start) || duration && (Number(duration[2]) < 1 || Number(duration[2]) > 7 || duration[1] && Number(duration[1]) !== Number(duration[2]) - 1)) return null;
    return { action: 'set-dates', start, end: offsetTripDate(start, duration ? Number(duration[2]) - 1 : 0) };
  }
  const parts = expression.replace(/\s*까지$/, '').split(/\s*(?:부터|~|～|–|—|\s+-\s+|\s+to\s+)\s*/i);
  const atom = /^(?:\d{4}-\d{2}-\d{2}|(?:(?:\d{4})\s*년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}[./]\d{1,2}|\d{1,2}\s*일|오늘|내일|모레|(?:(?:이번|다음|다다음)\s*주\s*|이번\s*)?[월화수목금토일]요일|(?:(?:이번|다음)\s*)?주말|today|tomorrow|(?:(?:this|next)\s+)?weekend)$/i;
  if (parts.length > 2 || parts.some(part => !atom.test(part.trim()))) return null;
  const first = calendarDates(`${parts[0].trim()}에`, context);
  const last = parts.length === 2 && first ? calendarDates(`${parts[1].trim()}에`, { ...context, days: [first[0]] }) : first;
  if (!first || !last || last[1] < first[0] || boundedTripEnd(first[0], last[1]) !== last[1]) return null;
  return { action: 'set-dates', start: first[0], end: last[1] };
}

/** Optional model fields must be grounded in the visitor's words, never schema defaults. */
export function groundAssistantProposal(value, messages, context) {
  const turns = messages.filter(item => item.role === 'user').map(item => item.content);
  const latest = turns.at(-1) || '';
  const dates = dateOnlyRequest(latest, context);
  if (dates !== undefined) return dates;
  // A transport-only follow-up cannot repeat the earlier request to build a trip.
  const mode = transportOnlyRequest(latest);
  if (mode) return { action: 'recalculate-route', transport: mode };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const action = { ...value };
  if (['visit', 'break'].includes(action.action) && /쉬는\s*시간|휴식/.test(latest)) {
    const turn = latest.replace(/\s/g, '').replace(/[.!。！]+$/, '');
    const named = (context.places || []).flatMap(place => {
      const name = typeof place.name === 'string' ? place.name.replace(/\s/g, '') : '';
      if (!name || !turn.startsWith(name)) return [];
      const match = turn.slice(name.length).match(/^(?:에서|의)?(?:쉬는시간|휴식시간|휴식)(?:만|을|은)?(\d{1,3})분(?:으로)?(?:바꿔|변경해|설정해|해)(?:줘|주세요)$/);
      return match ? [{ action: 'break', placeId: place.id, minutes: Number(match[1]) }] : [];
    });
    // Keep the existing real-ID and duration validators; never guess a target,
    // combine stay/rest edits or treat a question or exclusion as a command.
    return named.length === 1 && named[0].placeId === action.placeId ? named[0] : null;
  }
  const mentionsTransport = /자동차|승용차|자가용|렌[터트]카|(?<![가-힣])차(?:로|는|를|\s)|대중교통|버스|기차|전철|지하철|도보|걸어|자전거|\b(?:car|transport|transit|bus|train|walk|walking|bicycle|bike)\b/i.test(latest);
  const asksForJourney = /만들|짜\s*(?:줘|주세요)|계획|추천|찾아|검색|추가|넣어|대체|대안|교체|줄여|늘려|휴식|쉬|피곤|실내|비\s*(?:가|오는)|휴무|휴관|당일(?:치기)?(?:로)?\s*여행(?:을)?\s*하고\s*싶|(?:일정|장소|코스).*(?:바꿔|변경)|\b(?:plan|create|build|recommend|add|replace|itinerary)\b/i.test(latest);
  const question = /[?？]|(?:까요|나요|할까|어때|어떨까|괜찮아|가능해)\s*[.!。！]*$/i.test(latest);
  if (['create-itinerary', 'adapt-itinerary', 'recalculate-route'].includes(action.action) && mentionsTransport && (question || !asksForJourney)) return null;
  // Recalculation may use the current mode; an ungrounded optional mode may not.
  if (action.action === 'recalculate-route') { delete action.transport; return action; }
  if (!['create-itinerary', 'adapt-itinerary'].includes(action.action)) return action;
  const said = turns.join(' ');
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
  if (requestedBabyFacilities(turns)) action.profiles = [...new Set([...(Array.isArray(action.profiles) ? action.profiles : []), 'baby'])];
  else if (Array.isArray(action.profiles) && action.profiles.includes('baby')) {
    action.profiles = action.profiles.filter(profile => profile !== 'baby');
    if (!action.profiles.length) delete action.profiles;
  }
  if (action.reason === 'fatigue' && !requestedFatigueAdjustment(latest)) delete action.reason;
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
  const nearbyOrigin = nearbyDayTripOrigin(action, turns, context);
  if (nearbyOrigin === null) return null;
  if (nearbyOrigin) { action.region = nearbyOrigin; action.originRegion = nearbyOrigin; }
  return action;
}
