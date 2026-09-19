const cleanText = value => typeof value === 'string' ? value.trim() : '';

export function normalizeParkingPhone(value) {
  if (typeof value !== 'string') return null;
  const source = value.trim();
  if (!source || /[\r\n]/.test(source)) return null;
  const normalized = source.replace(/[ \t\-()]/g, '');
  if (!/^\+?\d+$/.test(normalized)) return null;
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  return digits.length >= 8 && digits.length <= 15 ? normalized : null;
}

export function createParkingTelHref(value) {
  const phoneNumber = normalizeParkingPhone(value);
  return phoneNumber ? `tel:${phoneNumber}` : null;
}

export function buildParkingContactQuestion({ parkingName, phoneNumber, placeName }) {
  const parking = cleanText(parkingName);
  const phone = normalizeParkingPhone(phoneNumber);
  if (!parking || !phone) return null;
  const place = cleanText(placeName);
  const finalLine = place
    ? `휠체어 승하차 공간을 사용할 수 있는지와 주차장에서 ${place} 입구까지 계단 없는 길이 있는지도 확인 부탁드립니다.`
    : '휠체어 승하차 공간을 사용할 수 있는지와 주차장에서 관광지 입구까지 계단 없는 길이 있는지도 확인 부탁드립니다.';
  return [
    parking,
    `전화번호: ${phone}`,
    '',
    '문의:',
    `${parking}의 장애인전용주차구역을 이용하려고 합니다.`,
    '현재 확인 가능한 범위에서 지금 주차할 수 있는 자리가 있나요?',
    '이 번호에서 현장 상황을 확인할 수 없다면 주차관리실 연락처를 알려주실 수 있나요?',
    finalLine,
  ].join('\n');
}

export function isKakaoRelayOpen(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const hour = Number(new Intl.DateTimeFormat('en-US-u-hc-h23', {
    timeZone: 'Asia/Seoul', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).find(part => part.type === 'hour')?.value);
  return Number.isInteger(hour) && hour >= 8 && hour < 24;
}
