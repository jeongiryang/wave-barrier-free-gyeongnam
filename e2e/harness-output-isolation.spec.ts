import { test, expect } from '@playwright/test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { mockPlannerApi } from './fixtures';

test('writing harness trace HTML preserves the loaded page and an unsent request', async ({ page }, info) => {
  await mockPlannerApi(page);
  await page.goto('/planner');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('textbox').fill('아직 보내지 않은 여행 요청');
  let navigations = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
  const directory = join(process.cwd(), 'harness-results', 'watch-isolation');
  const file = join(directory, `${info.project.name}-${info.workerIndex}.html`);
  await mkdir(directory, { recursive: true });
  try {
    // Real trace artifacts are added and rewritten while a browser is active.
    for (let index = 0; index < 6; index++) {
      await writeFile(file, `<!doctype html><title>Bounded trace ${index}</title><p>QA artifact</p>`);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(600);
    expect(navigations).toBe(0);
    await expect(chat.getByRole('textbox')).toHaveValue('아직 보내지 않은 여행 요청');
  } finally { await rm(file, { force: true }); }
});
