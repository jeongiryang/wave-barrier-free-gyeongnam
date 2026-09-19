import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPlannerApi, plan } from "./fixtures";

for (const en of [false, true]) for (const theme of ['light', 'dark']) {
  test(`one place action preserves facility evidence and keyboard order ${en ? 'en' : 'ko'} ${theme}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mockPlannerApi(page);
    await page.addInitScript(({ en, theme }) => { localStorage.setItem('wave-locale', en ? 'en' : 'ko'); localStorage.setItem('wave-theme', theme); }, { en, theme });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const image = await readFile('public/media/wave-story/hero-coast-small.webp');
    await page.route('https://wave.test/museum.svg', route => route.fulfill({ contentType: 'image/webp', body: image }));
    const accessibility = [
      { key: 'route', label: '접근로', state: 'confirmed', detail: '공식 접근로 기록' },
      { key: 'parking', label: '장애인 주차구역', state: 'confirmed', detail: '공식 주차 기록' },
      { key: 'wheelchair', label: '휠체어 대여', state: 'confirmed', detail: '공식 휠체어 기록' },
      { key: 'stroller', label: '유모차 대여', state: 'confirmed', detail: '공식 유모차 기록' },
      { key: 'restroom', label: '장애인 화장실', state: 'unknown', detail: '' },
      { key: 'elevator', label: '승강기', state: 'negative', detail: '승강기 없음' },
    ];
    const pending: { hold?: Promise<void> } = {}; let release!: () => void;
    await page.route('**/api/wave?action=plan*', async route => { if (pending.hold) await pending.hold; return route.fulfill({ json: {
      ...plan, criteria: { facilityKeys: ['route'] }, places: [{ ...plan.places[0], accessibility }],
      explorationPlaces: [{ ...plan.places[1], accessibility: [{ key: 'route', label: '접근로', state: 'unknown', detail: '' }] }],
    } }); });
    await page.goto('/planner?region=창원');
    const card = page.locator('.simple-place-row').first();
    await expect(card).toHaveAccessibleName('경남도립미술관');
    await expect(card.locator('.simple-facility-summary > span')).toHaveCount(5);
    await expect(card.locator('.facility-unknown')).toHaveText(en ? 'Accessible toilet not reported' : '장애인 화장실 정보 없음');
    await expect(card.locator('.facility-missing')).toHaveText(en ? 'Lift unavailable' : '승강기 없음');
    await expect(card).not.toContainText(/\d+%/);
    const title = card.getByRole('button', { name: '경남도립미술관', exact: true });
    const add = card.locator('.simple-place-add');
    await expect(card.locator('h3')).toHaveAttribute('lang', 'ko');
    await title.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(title).toBeFocused();
    await page.keyboard.press('Tab'); await expect(add).toBeFocused(); await page.keyboard.press('Enter');
    await expect(add).toHaveAttribute('aria-pressed', 'true');
    await expect(add).toHaveAccessibleName(`경남도립미술관 ${en ? 'added · undo' : '담았음 · 되돌리기'}`);
    await expect(page.locator('.simple-results')).toBeVisible();
    const helper = page.locator('.simple-condition-help');
    await expect(helper).toContainText(en ? 'Adjust only the conditions you choose' : '조건을 직접 조정하면 더 볼 수 있어요');
    await helper.getByRole('checkbox', { name: en ? /Include places with unconfirmed facilities/ : /필요한 편의가 미확인인 장소 포함/ }).check();
    await helper.getByRole('button', { name: en ? 'Apply selected changes' : '선택한 조건 적용', exact: true }).click();
    const unknown = page.locator('.simple-exploration .simple-place-row');
    await expect(unknown.locator('.simple-place-add')).toHaveText(en ? '→Details' : '→편의 확인');
    await expect(unknown.locator('.facility-unknown')).toContainText(en ? 'Access path not reported' : '접근로 정보 없음');
    for (const button of await card.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await card.scrollIntoViewIfNeeded();
    expect((await new AxeBuilder({ page }).include('.simple-results').analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await card.screenshot({ path: test.info().outputPath(`card-${en ? 'en' : 'ko'}-${theme}.png`) });
    await add.click(); await expect(add).toHaveAttribute('aria-pressed', 'false');
    pending.hold = new Promise<void>(resolve => { release = resolve; });
    await page.getByRole('button', { name: '자연·휴양', exact: true }).click();
    try { await expect(card).toHaveAttribute('data-result-current', 'false'); await expect(add).toBeDisabled(); }
    finally { release(); }
    expect(errors).toEqual([]);
  });
}
