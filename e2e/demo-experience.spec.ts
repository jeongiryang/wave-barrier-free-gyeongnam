import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi } from './fixtures';
for (const width of [1440,960,390]) test(`isolated demo at ${width}px previews applies undoes without changing real storage`,async({page})=>{
 await mockPublicShellApi(page); await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>localStorage.setItem('wave-saved-places',JSON.stringify(['real-sentinel'])));
 await page.goto('/demo'); await expect(page.getByRole('heading',{name:'예시 여행으로 먼저 해보세요'})).toBeVisible();
 const before=await page.locator('.demo-timeline').innerText();
 await page.getByRole('button',{name:'첫 장소 뒤 20분 쉬기',exact:true}).click();
 await expect(page.locator('.demo-timeline')).toHaveText(before, { useInnerText: true });
 await page.getByRole('button',{name:'시연 일정에 적용'}).click(); await expect(page.locator('.demo-timeline')).toContainText('휴식 20분');
 await page.getByRole('button',{name:'되돌리기',exact:true}).click(); await expect(page.locator('.demo-timeline')).toHaveText(before, { useInnerText: true });
 await page.getByRole('button',{name:'비 오는 날의 실내 여행',exact:true}).click(); await expect(page.locator('.demo-timeline')).toContainText('가상 문화 전시관');
 expect(await page.evaluate(()=>localStorage.getItem('wave-saved-places'))).toBe('["real-sentinel"]');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
