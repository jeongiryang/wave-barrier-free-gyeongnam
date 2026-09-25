import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

export const awardHeroImage = 'https://tong.visitkorea.or.kr/test-landing-award.webp';

/** Exercise the current provider-driven hero with a decoded official-host image. */
export async function mockAwardHero(page: Page, failImage = false) {
  const bitmap = await readFile('public/media/wave-story/hero-coast-small.webp');
  await page.route(awardHeroImage, route => failImage ? route.abort() : route.fulfill({ contentType: 'image/webp', body: bitmap }));
  await page.route('**/api/wave?**', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'enrich') return route.fallback();
    return route.fulfill({ json: { awards: [{ id: 'hero', title: '검증 여행 사진', address: '경상남도 통영시', source: '관광공모전 수상작', image: awardHeroImage }] } });
  });
}
