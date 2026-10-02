import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi } from './fixtures';
for (const width of [1440,960,390]) test(`isolated demo at ${width}px previews applies undoes without changing real storage`,async({page})=>{
 await mockPublicShellApi(page); await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>localStorage.setItem('wave-saved-places',JSON.stringify(['real-sentinel'])));
 await page.goto('/demo'); await expect(page.getByRole('heading',{name:'[시연] 일정 기능 살펴보기'})).toBeVisible();
 // The streamed heading can precede client hydration. The existing guarded
 // action becomes enabled only after the demo's interactive state is ready.
 await expect(page.getByRole('button',{name:'첫 방문 뒤 20분 쉬기',exact:true})).toBeEnabled();
 const stories=page.locator('#demo-community');
 await expect(stories.locator('article')).toHaveCount(3);
 await expect(stories.locator('small')).toHaveText(['여행 후기','여행 질문','시설 제보']);
 for(const heading of await stories.locator('h3').all()) await expect(heading).toContainText('[시연]');
 for(const image of await stories.locator('img').all()) await expect(image).toHaveAttribute('alt', /AI 생성 삽화/);
 await expect(stories).not.toContainText('이미지: AI 생성');
 await expect(stories).not.toContainText('실제 예보나 특정 시설의 운영 안내가 아닌 시연 상황입니다.');
 await expect(stories).not.toContainText('실제 방문자가 작성한 제보가 아닙니다.');
 const timeline=page.locator('.demo-timeline');
 // Start from a different rest duration so applying the proposal proves a real
 // change, rather than matching the scenario's already-present 20 minutes.
 await timeline.getByRole('listitem').first().getByRole('combobox',{name:'휴식',exact:true}).selectOption('0');
 const before=await timeline.innerText();
 await expect(timeline.locator('li > strong').nth(1)).toHaveText('11:00');
 await page.getByRole('button',{name:'첫 방문 뒤 20분 쉬기',exact:true}).click();
 await expect(page.locator('.demo-timeline')).toHaveText(before, { useInnerText: true });
 await expect(page.locator('.demo-badge')).toHaveCount(0);
 await expect(page.locator('.demo-page > header')).toContainText('장소 이름·사진·편의시설·날씨·축제·운영시간·이동 경로는 실제 제공처 조회 결과로만 확인합니다.');
 await expect(page.locator('.demo-cover')).toHaveAttribute('alt','실제 관광지 사진이 아닌 AI 생성 삽화');
 await page.getByRole('button',{name:'변경안 적용',exact:true}).click(); await expect(timeline).toContainText('휴식 20분');
 await expect(timeline.locator('li > strong').nth(1)).toHaveText('11:20');
 const undo=page.getByRole('button',{name:'직전 일정 변경 되돌리기',exact:true});
 await undo.click(); await expect(timeline).toHaveText(before, { useInnerText: true });
 await expect(undo).toBeDisabled();
 await page.getByRole('button',{name:'약속 시각이 있는 날',exact:true}).click(); await expect(timeline).toContainText('예약한 방문지 B');
 await expect(timeline).toContainText('약속 시각 12:00');
 expect(await page.evaluate(()=>localStorage.getItem('wave-saved-places'))).toBe('["real-sentinel"]');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
