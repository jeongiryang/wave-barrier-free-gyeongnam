import { expect,test } from '@playwright/test';
import { openSupportMenu } from './support-menu';
import { mockPublicShellApi } from './fixtures';
for (const installAvailable of [false,true]) test(`preferences omit install prompts (browser support: ${installAvailable})`,async({page})=>{
  await mockPublicShellApi(page);
  await page.goto('/');
  await openSupportMenu(page);
  if(installAvailable) await page.evaluate(()=>window.dispatchEvent(new Event('beforeinstallprompt')));
  await page.getByRole('button',{name:'환경설정 열기',exact:true}).click();
  await expect(page.locator('.preference-panel')).toBeVisible();
  await expect(page.locator('.app-install,.app-install-note')).toHaveCount(0);
  await expect(page.locator('.preference-panel')).not.toContainText('홈 화면에 추가');
});
