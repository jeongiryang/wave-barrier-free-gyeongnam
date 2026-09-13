import { FACILITIES, resolveFacilityKeys } from './facility-selection.js';
import { GYEONGNAM_REGION_POINTS } from './gyeongnam-regions.js';
import { validTripDate, boundedTripEnd } from './trip-dates.js';
import { groundAssistantProposal } from './assistant-grounding.js';

export function startNaruGuide({ region, start, end, selected = [], revision }) {
  return { step: 'region', region, start, end, selected: resolveFacilityKeys({ profiles: selected }), revision, question: '어느 지역으로 갈까요?', choices: ['현재 지역 유지', '경남 전체', '통영', '거제'] };
}
export function advanceNaruGuide(state, answer) {
  const text = String(answer || '').trim();
  if (/^(취소|그만|안내 끝내기)$/.test(text)) return null;
  if (text !== '없어요' && /말고|아니|필요\s*없|빼|제외|않/.test(text)) return { ...state, question: state.step === 'facilities' ? '필요한 시설만 알려주세요. 아무 시설도 필요 없다면 “없어요”라고 답해 주세요.' : '원하는 조건 하나를 다시 알려주세요.' };
  if (state.step === 'region') {
    const region = text === '현재 지역 유지' ? state.region : Object.keys(GYEONGNAM_REGION_POINTS).find(name => text === name || text === `${name}에서`);
    if (!region) return { ...state, question: '경남의 지역 이름 하나를 알려주세요. 예: 통영' };
    return { ...state, region, step: 'dates', question: '언제 여행할까요? 예: 2026-10-01 또는 2026-10-01~2026-10-03', choices: state.start ? ['현재 날짜 유지', '날짜 없이 찾아보기'] : ['날짜 없이 찾아보기'] };
  }
  if (state.step === 'dates') {
    let start = state.start, end = state.end;
    if (text === '날짜 없이 찾아보기') { start = ''; end = ''; }
    else if (text !== '현재 날짜 유지') {
      let dates = text.match(/\d{4}-\d{2}-\d{2}/g) || [];
      if (!dates.length) {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const parsed = groundAssistantProposal({ action: 'set-dates' }, [{ role: 'user', content: `여행 날짜만 ${text}로 바꿔줘` }], { today, days: state.start ? [state.start] : [] });
        if (parsed?.action === 'set-dates' && parsed.start) dates = [parsed.start, parsed.end || parsed.start];
      }
      if (dates.length < 1 || dates.length > 2 || dates.some(date => !validTripDate(date)) || boundedTripEnd(dates[0], dates[1] || dates[0]) !== (dates[1] || dates[0]))
        return { ...state, question: '7일 이내의 여행 날짜를 연-월-일로 알려주세요. 예: 2026-10-01' };
      [start, end] = [dates[0], dates[1] || dates[0]];
    }
    return { ...state, start, end, step: 'facilities', question: '꼭 필요한 시설이 있나요?', choices: ['현재 편의 유지', '장애인 화장실', '접근로', '수유실', '없어요'] };
  }
  if (state.step === 'facilities') {
    let selected = state.selected;
    if (text === '없어요') selected = [];
    else if (text !== '현재 편의 유지') {
      const matches = FACILITIES.filter(item => text.includes(item.label));
      if (!matches.length) return { ...state, question: '필요한 시설 이름을 알려주세요. 없으면 “없어요”라고 답해 주세요.' };
      selected = [...new Set([...selected, ...matches.map(item => item.key)])];
    }
    return { ...state, selected, step: 'review', question: `${state.region} · ${state.start ? `${state.start}~${state.end}` : '날짜 없이 탐색'} · ${selected.length ? FACILITIES.filter(item => selected.includes(item.key)).map(item => item.label).join(', ') : '필수 편의 없음'}. 이 조건으로 여행지를 찾을까요?`, choices: ['이 조건으로 찾기', '처음부터 다시'] };
  }
  return state;
}
