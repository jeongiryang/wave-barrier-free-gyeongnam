const cleanText = value => typeof value === 'string' ? value.trim() : '';

export function normalizeParkingPhone(value) {
  const source = cleanText(value);
  if (!source) return '';
  const leadingPlus = source.startsWith('+');
  const digits = source.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  return `${leadingPlus ? '+' : ''}${digits}`;
}

export function buildParkingContactContent({ parkingName, phoneNumber, placeName } = {}) {
  const parking = cleanText(parkingName) || '선택한 주차장';
  const phone = normalizeParkingPhone(phoneNumber);
  const place = cleanText(placeName);
  const destination = place ? `${place} 입구` : '관광지 입구';
  const lines = [parking];
  if (phone) lines.push(`전화번호: ${phone}`);
  lines.push(
    '',
    '문의:',
    `${parking}의 장애인전용주차구역을 이용하려고 합니다.`,
    '현재 확인 가능한 범위에서 지금 주차할 수 있는 자리가 있나요?',
    '이 번호에서 현장 상황을 확인할 수 없다면 주차관리실 연락처를 알려주실 수 있나요?',
    `휠체어 승하차 공간을 사용할 수 있는지와 주차장에서 ${destination}까지 계단 없는 길이 있는지도 확인 부탁드립니다.`,
  );
  return { parkingName: parking, phoneNumber: phone || undefined, inquiryText: lines.join('\n') };
}

export function isKakaoRelayOpen(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(value);
  const hour = Number(parts.find(part => part.type === 'hour')?.value);
  return Number.isInteger(hour) && hour >= 8 && hour < 24;
}
