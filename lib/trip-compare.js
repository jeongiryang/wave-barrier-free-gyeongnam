import { facilityLabel } from './facility-selection.js';
const text = value => typeof value === 'string' && value.trim() ? value.trim() : '정보 없음';
const days = value => Number.isInteger(value) && value > 0 ? value === 1 ? '하루' : `${value - 1}박 ${value}일` : '정보 없음';
const places = (count, dayCount) => Number.isInteger(count) && count >= 0 && Number.isInteger(dayCount) && dayCount > 0 ? `전체 ${count}곳 · 하루 평균 ${(count / dayCount).toFixed(1)}곳` : '정보 없음';
const facilities = value => Array.isArray(value) && value.length ? [...new Set(value.filter(item => typeof item === 'string' && item.trim()))].map(key => facilityLabel(key)).sort((a, b) => a.localeCompare(b, 'ko')).join(', ') || '정보 없음' : '정보 없음';

export function compareTrips(left, right) {
  const pairs = [
    ['지역', text(left?.region), text(right?.region)],
    ['날짜 수', days(left?.dayCount), days(right?.dayCount)],
    ['장소 수', places(left?.placeCount, left?.dayCount), places(right?.placeCount, right?.dayCount)],
    ['고른 편의', facilities(left?.facilityKeys), facilities(right?.facilityKeys)],
  ];
  return pairs.map(([label, a, b]) => ({ label, left: a, right: b, same: a === b })).sort((a, b) => Number(a.same) - Number(b.same));
}
