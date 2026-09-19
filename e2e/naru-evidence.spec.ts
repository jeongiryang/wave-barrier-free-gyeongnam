import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi, plan } from './fixtures';
import type { Place, PlanData } from '../features/planner/types';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

// 2026-09-19 실측을 옮긴 합성 표본이다. 승강기는 한 곳만 확인되고 한 곳은
// 명시적으로 없다고 적혀 있다. 미확인과 없음은 끝까지 구분되어야 한다.
const detail = (state: 'confirmed' | 'unknown' | 'negative') => state === 'confirmed' ? '합성 공식 원문: 있음' : state === 'negative' ? '없음' : '';
const entry = (key: string, label: string, state: 'confirmed' | 'unknown' | 'negative') => ({ key, label, state, detail: detail(state) });
function withAccess(states: Array<Record<string, 'confirmed' | 'unknown' | 'negative'>>): Place[] {
  const labels: Record<string, string> = { route: '접근로', elevator: '승강기', parking: '장애인 주차구역', restroom: '장애인 화장실', wheelchair: '휠체어 대여' };
  return plan.places.map((place, index) => ({ ...place, image: '', accessibility: Object.entries(states[index]).map(([key, state]) => entry(key, labels[key], state)) })) as Place[];
}
const mixed = withAccess([
  { route: 'confirmed', elevator: 'confirmed', parking: 'confirmed', restroom: 'confirmed', wheelchair: 'confirmed' },
  { route: 'confirmed', elevator: 'negative', parking: 'confirmed', restroom: 'confirmed', wheelchair: 'confirmed' },
]);
const noneConfirmed = withAccess([
  { route: 'confirmed', elevator: 'unknown', parking: 'confirmed', restroom: 'confirmed', wheelchair: 'confirmed' },
  { route: 'confirmed', elevator: 'unknown', parking: 'confirmed', restroom: 'confirmed', wheelchair: 'confirmed' },
]);

function resultPlan(records: Place[], keys: string[]): PlanData {
  return { ...plan, mode: 'live', places: records, criteria: { facilityKeys: keys },
    statuses: plan.statuses.map(status => ({ ...status, state: 'live' })),
    stops: records.map(place => ({ id: place.id, title: place.name, note: place.summary, source: place.source, mapX: place.mapX, mapY: place.mapY, contentTypeId: place.contentTypeId })) } as PlanData;
}

async function setup(page: Page, records: Place[], options: { chooseFacilities?: boolean } = {}) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic conversation API' } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: records });
  await mockPublicShellApi(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/wave?*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('action') !== 'plan') return route.fallback();
    return route.fulfill({ json: resultPlan(records, (url.searchParams.get('facilityKeys') || '').split(',').filter(Boolean)) });
  });
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    return route.fulfill({ json: { reply: '합성 모델 응답', proposal: { action: 'settings', region: '창원' } } });
  });
  if (!options.chooseFacilities) await page.addInitScript(() => localStorage.setItem('wave-naru-starter-v1', 'done'));
  await page.goto('/planner');
  const launcher = page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true });
  await expect(launcher).toBeEnabled();
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await expect(chat).toBeVisible();
  if (options.chooseFacilities) {
    await chat.getByRole('button', { name: '휠체어 이동에 필요한 시설', exact: true }).click();
    await chat.getByRole('button', { name: '선택 적용', exact: true }).click();
  }
  return { chat, errors };
}

async function search(chat: Locator) {
  await chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('창원 여행지를 찾아줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByLabel('대화에서 찾은 여행지').last().locator('.naru-place-name').first()).toBeVisible();
}

test('편의 조건을 고른 뒤 장소를 물으면 근거 요약과 두 묶음이 보인다', async ({ page }) => {
  const app = await setup(page, mixed, { chooseFacilities: true });
  await search(app.chat);
  const summary = app.chat.locator('[data-evidence-summary]').last();
  // 숫자는 서버 응답에서 코드가 센 값이다. 모델 응답에는 숫자가 없다.
  await expect(summary).toHaveText('창원에서 2곳을 봤어요. 승강기가 확인된 곳은 1곳이고, 1곳은 승강기가 없다고 적혀 있어요.');
  await expect(app.chat.getByRole('group', { name: '확인된 곳 1곳', exact: true }).last()).toBeVisible();
  await expect(app.chat.getByRole('group', { name: '정보가 없는 곳 1곳', exact: true }).last()).toBeVisible();
  await expect(app.chat.locator('[data-evidence-group=confirmed]').last().locator('.naru-place-name')).toHaveText([mixed[0].name]);
  await expect(app.chat.locator('[data-evidence-group=unconfirmed]').last().locator('.naru-place-name')).toHaveText([mixed[1].name]);
  expect(app.errors).toEqual([]);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('확인된 곳이 없으면 숨기지 않고 그대로 말한다', async ({ page }) => {
  const app = await setup(page, noneConfirmed, { chooseFacilities: true });
  await search(app.chat);
  const summary = app.chat.locator('[data-evidence-summary]').last();
  await expect(summary).toHaveText('창원에서 2곳을 봤어요. 승강기가 확인된 곳은 없어요. 2곳 모두 정보가 등록돼 있지 않아요.');
  await expect(app.chat.getByRole('group', { name: '확인된 곳 0곳', exact: true }).last()).toBeVisible();
  await expect(app.chat.getByRole('group', { name: '정보가 없는 곳 2곳', exact: true }).last()).toBeVisible();
  expect(app.errors).toEqual([]);
});

test('미확인과 명시적 부재는 색이 아니라 글자로 구분된다', async ({ page }) => {
  const app = await setup(page, mixed, { chooseFacilities: true });
  await search(app.chat);
  await expect(app.chat.locator('[data-evidence-group=confirmed]').last().locator('.access-badge')).toHaveText(['승강기 확인']);
  await expect(app.chat.locator('[data-evidence-group=unconfirmed]').last().locator('.access-badge')).toHaveText(['승강기 없음']);
});

test('등록되지 않은 편의는 "없음"이 아니라 "정보 없음"으로 적는다', async ({ page }) => {
  const app = await setup(page, noneConfirmed, { chooseFacilities: true });
  await search(app.chat);
  await expect(app.chat.locator('[data-evidence-group=unconfirmed]').last().locator('.access-badge')).toHaveText(['승강기 정보 없음', '승강기 정보 없음']);
  expect(app.errors).toEqual([]);
});

test('정보가 없는 곳도 목록에 남고 담기가 막히지 않는다', async ({ page }) => {
  const app = await setup(page, mixed, { chooseFacilities: true });
  await search(app.chat);
  const unconfirmed = app.chat.locator('[data-evidence-group=unconfirmed]').last();
  await expect(unconfirmed.locator('article')).toHaveCount(1);
  const action = unconfirmed.locator('article > button:last-child');
  await expect(action).toBeEnabled();
  await expect(action).toHaveText('담기');
  await action.click();
  await expect(unconfirmed.locator('article > button:last-child')).toHaveText('✓ 담았음');
  expect(app.errors).toEqual([]);
});

test('편의 조건을 고르지 않았으면 기준이 없으므로 근거 표시를 하지 않는다', async ({ page }) => {
  const app = await setup(page, mixed);
  await search(app.chat);
  await expect(app.chat.locator('[data-evidence-summary]')).toHaveCount(0);
  await expect(app.chat.locator('[data-evidence-group]')).toHaveCount(0);
  await expect(app.chat.getByLabel('대화에서 찾은 여행지').last().locator('.naru-place-name')).toHaveText(mixed.map(place => place.name));
  expect(app.errors).toEqual([]);
  expect((await new AxeBuilder({ page }).include('.naru-panel').analyze()).violations).toEqual([]);
});


test('requested three Tongyeong places exclude other cities even when search returns mixed regions', async ({ page }) => {
  const records = ['창원', '통영', '거제', '통영', '통영', '통영'].map((city, index) => ({ ...mixed[0], id: String(7000 + index), name: city + ' 합성 장소 ' + index, city }));
  const app = await setup(page, records);
  await page.route('**/api/assistant', route => route.fulfill({ json: route.request().method() === 'GET' ? { available: true } : { reply: '요청한 지역과 개수로 확인할게요.', proposal: { action: 'settings', region: '통영', count: 3 } } }));
  await app.chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('통영 3곳 추천해줘. 창원, 거제는 제외해줘.');
  await app.chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  const results = app.chat.getByLabel('대화에서 찾은 여행지').last();
  await expect(results.locator('.naru-place-name')).toHaveText([records[1].name, records[3].name, records[4].name]);
  await expect(app.chat).toContainText('후보 중 3곳');
  expect(app.errors).toEqual([]);
});


for (const failure of ['503', 'network'] as const) test(`offline ${failure} fallback preserves Tongyeong, exclusions, count and chosen facilities`, async ({ page }) => {
  const records = ['창원', '통영', '거제', '통영', '통영', '통영'].map((city, index) => ({ ...mixed[0], id: String(8000 + index), name: city + ' 대체검증 장소 ' + index, city }));
  const app = await setup(page, records, { chooseFacilities: true });
  await search(app.chat); // An existing Changwon conversation must not leak into the new search.
  const requests: URL[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname === '/api/wave' && url.searchParams.get('action') === 'plan') requests.push(url); });
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    return failure === '503' ? route.fulfill({ status: 503, json: { code: 'AI_UNAVAILABLE' } }) : route.abort('failed');
  });
  await app.chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true }).fill('통영 여행지를 3곳만 추천해줘. 창원이나 거제는 제외해줘.');
  await app.chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  const results = app.chat.getByLabel('대화에서 찾은 여행지').last();
  await expect(results.locator('.naru-place-name')).toHaveText([records[1].name, records[3].name, records[4].name]);
  await expect(app.chat).toContainText('AI 연결이 원활하지 않아 간편 명령으로 처리할게요.');
  await expect(app.chat).toContainText('후보 중 3곳');
  expect(requests.at(-1)?.searchParams.get('region')).toBe('통영');
  expect(requests.at(-1)?.searchParams.get('facilityKeys')).toContain('elevator');
  expect(app.errors).toEqual([]);
});
