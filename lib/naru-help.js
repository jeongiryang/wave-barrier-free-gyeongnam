/** Needs are chosen by the traveller, never inferred from age or disability. */
export const NARU_HELP = [
  { id: 'guided', title: '한 번에 하나씩 안내받기', example: '한 번에 하나씩 도와줘', result: '지역, 날짜, 필요한 시설을 하나씩 묻고 마지막에 조건을 확인해요.' },
  { id: 'transcript', title: '해설을 글로 읽을 때', example: '첫 번째 장소의 해설 대본을 보여줘', result: '일치하는 공식 해설이 있으면 소리를 재생하지 않고 대본을 읽어요.' },
  { id: 'facilities', title: '필요한 시설을 확인할 때', example: '일정에 담은 장소의 접근로와 장애인 화장실 정보를 비교해줘', result: '장소별로 확인된 시설과 아직 확인하지 못한 항목을 비교해요.' },
  { id: 'rest', title: '오래 걷기 부담될 때', example: '지금 피곤해. 오늘 일정을 여유롭게 줄이고 쉬는 시간을 넣어줘', result: '고정 방문과 필요한 편의를 유지하며 방문 수와 휴식을 조정할 일정안을 만들어요.' },
  { id: 'baby', title: '아이와 쉬어 가고 싶을 때', example: '첫 번째 장소 뒤에 쉬는 시간을 60분 넣어줘', result: '체류시간을 유지하고 이후 시간을 조정한 뒤 각 장소의 운영시간을 다시 확인해요.' },
  { id: 'return', title: '일찍 돌아가고 싶을 때', example: '오후 4시까지 돌아오도록 귀가 마감 시간을 정해줘', result: '귀가 마감 시간을 설정하고 일정에서 확인할 수 있어요.' },
  { id: 'read', title: '장소 정보를 읽어보고 싶을 때', example: '첫 번째 장소의 이용 정보를 보여줘', result: '시설과 이용 정보를 글로 확인해요. 나루 답변은 읽어주기 버튼으로 들을 수도 있어요.' },
  { id: 'inquiry', title: '직원에게 글로 물어볼 때', example: '방문 전에 직원에게 보여줄 문의 카드를 열어줘', result: '장소와 필요한 시설에 맞는 질문을 큰 글자로 보여주고 복사할 수 있어요.' },
  { id: 'edit', title: '버튼을 여러 번 누르기 어려울 때', example: '두 번째 장소에서 머무는 시간을 45분으로 바꿔줘', result: '말이나 글로 장소의 시간을 바꾸고, 잘못 바꾼 내용은 되돌려요.' },
  { id: 'preview', title: '주차장과 입구를 미리 살펴볼 때', example: '주차장과 입구를 미리 보고 싶어', result: '주차·입구·시설을 차례로 확인하고 공개 장소를 기준으로 지도와 로드뷰를 열어요.' },
];
export function naruLocalHelp(text) {
  const value = String(text || '').trim();
  if (/취소|하지\s*마|하지\s*말|열지\s*마|열지\s*말|보여주지\s*마/.test(value)) return null;
  if (/대본|해설.*(글|문자|읽)|소리.*없이.*해설/.test(value)) return 'transcript';
  if (/사용법|어떤.*도와|무엇.*도와|뭘.*할 수|도움말/.test(value)) return 'help';
  if (/문의.{0,15}카드|직원.{0,15}(물어|보여)|큰\s*글자.{0,12}(문의|질문)/.test(value)) return 'inquiry';
  if (/(주차|입구|시설).{0,15}미리.{0,8}(보|살펴)|주차장.*입구|입구.*주차장/.test(value)) return 'preview';
  if (/(편의|시설|화장실|접근로).*(비교|확인해)/.test(value)) return 'compare';
  return null;
}
