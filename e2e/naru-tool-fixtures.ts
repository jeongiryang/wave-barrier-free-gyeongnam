import { expect, type Page } from '@playwright/test';

export const naruDialog = (page: Page) => page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
const toolNames: Record<string, [string, string]> = {
  conditions: ['지역·활동', '어디로 갈지 고르기'], facilities: ['필요한 편의', '필요한 편의 고르기'], dates: ['날짜·기간', '여행 날짜 정하기'], places: ['여행지 찾기', '여행지 찾아 담기'],
  itinerary: ['날짜·순서·시간', '방문 순서와 시간 바꾸기'], receipt: ['일정 선정 근거', '일정 선정 근거'], map: ['지도·경로', '지도에서 동선 보기'], alternatives: ['한 곳 바꾸기', '다른 장소로 바꾸기'],
  comfort: ['이동 부담·휴식', '걷기와 휴식 조정하기'], course: ['코스 잇기', '코스 잇기'], split: ['동행·합류', '동행·합류'], readiness: ['출발 전 확인', '출발 전 확인'], weather: ['날씨', '날씨'],
  transport: ['교통·귀가', '교통과 귀가편 찾기'], compare: ['편의 비교', '장소별 편의 비교하기'], preview: ['주차·입구 미리보기', '주차장과 입구 미리 보기'], transcript: ['해설 대본', '해설 대본'],
  inquiry: ['방문 전 문의', '직원에게 물어볼 말 준비하기'], budget: ['여행비', '여행비'], experience: ['페이스·감각지도·여행여권', '페이스·감각지도·여행여권'], audio: ['오디오 가이드·후기', '장소 해설 듣기'],
  coordinates: ['장소 좌표 복원', '장소 좌표 복원'], 'route-check': ['이동 구간 확인', '이동 구간 확인'], save: ['내 여행에 저장', '내 여행에 저장'], share: ['공유', '공유'],
  offline: ['오프라인 요약', '인터넷 없이 볼 일정 저장하기'], calendar: ['캘린더', '캘린더'], 'on-trip': ['여행 당일 안내', '오늘 일정 확인하기'],
};
export function naruToolLabel(labelOrId: string) {
  return (toolNames[labelOrId] || Object.values(toolNames).find(names => names.includes(labelOrId)))?.[1] || labelOrId;
}
export async function openNaruTool(page: Page, label: string) {
  const chat = naruDialog(page);
  if (!await chat.isVisible()) await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await expect(chat).toBeVisible();
  await chat.getByRole('tab', { name: '직접 골라서 하기', exact: true }).click();
  const catalog = chat.getByRole('button', { name: '다른 기능 고르기', exact: true });
  if (await catalog.isVisible()) await catalog.click();
  await chat.getByRole('button', { name: '전체', exact: true }).click();
  await chat.getByRole('region', { name: '모든 여행 도구', exact: true }).locator('.naru-task-actions > button').filter({ has: page.getByText(naruToolLabel(label), { exact: true }) }).click();
  await expect(chat).toBeVisible();
  return chat;
}
export async function closeNaruTool(page: Page) {
  await naruDialog(page).getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(naruDialog(page)).toBeHidden();
}
