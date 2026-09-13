import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions, openItinerary, plan } from "./fixtures";

test("명시적 편의 부재와 미확인은 분리하고 부재 장소는 일정에 추가하지 않는다", async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page, { explorationOnly: true });
  const [negative, unknown] = plan.places.map((place, index) => ({ ...place, score: index ? null : 0,
    accessibility: [{ key: "route", label: "접근로", state: index ? "unknown" : "negative", detail: index ? "" : "접근로 없음" }],
    knownFields: index ? 0 : 1, unknownFields: index ? 1 : 0, negativeFields: index ? 0 : 1 }));
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: { ...plan, places: [], stops: [], criteria: { facilityKeys: ["route"] }, explorationPlaces: [unknown], excludedPlaces: [negative] } }));
  await page.goto("/planner");
  await page.locator('.simple-facility-trigger').click();
  const picker=page.getByRole('dialog',{name:'필요한 편의',exact:true});await picker.getByRole('checkbox',{name:'접근로',exact:true}).check();await picker.getByRole('button',{name:/^적용/}).click();
  await page.getByRole('combobox',{name:'여행 지역',exact:true}).selectOption('창원');
  await expect(page.locator('.simple-results')).toContainText('선택한 편의가 모두 확인된 장소를 찾지 못했어요.');
  await expect(page.locator('.simple-results > .simple-place-list article')).toHaveCount(0);
  const exploration=page.getByRole('region',{name:'편의정보가 부족한 장소',exact:true});
  await expect(exploration.getByRole('article')).toHaveCount(1);await expect(exploration).toContainText(unknown.name);await expect(exploration).not.toContainText(negative.name);
  const excluded=page.locator('.simple-excluded');await expect(excluded.locator('summary')).toHaveText('선택한 시설이 없어 제외된 장소 1곳');await excluded.locator('summary').click();
  await expect(excluded).toContainText('접근로 없음');await excluded.getByRole('button',{name:negative.name,exact:true}).click();
  const dialog=page.getByRole('dialog',{name:negative.name,exact:true});
  await expect(dialog.getByRole('button',{name:'일정에 추가',exact:true})).toBeDisabled();
  await expect(dialog.getByText(/필요한 편의가 제공되지 않는 것으로 기록된 장소는 추가할 수 없어요/)).toBeVisible();
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1')||'{}').values?.['wave-saved-places']||'[]'))).toEqual([]);
});

test("교통·요금·미확인 이동값은 확인 범위를 그대로 말한다", async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  await page.goto("/planner"); await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page,{start:'2026-09-20'});
  const view=page.getByRole('group',{name:'일정 보기 방식',exact:true});if(await view.count())await view.getByRole('button',{name:'지도',exact:true}).click();
  await page.locator('.reference-route-details > summary').click();
  const modes=page.getByRole('group',{name:'이동수단별 예상 시간',exact:true});
  await modes.getByRole('button',{name:/자동차/}).click();
  await expect(page.locator('.route-options')).toHaveAttribute('aria-busy','false');
  await expect(page.getByText("통행료 없음", { exact: true }).first()).toBeVisible();
  await expect(modes.getByRole('button',{name:/도보/})).toContainText('시간 정보 없음');
  await modes.getByRole('button',{name:/도보/}).click();
  await expect(page.getByText(/확인되지 않은 시간을 임의로 표시하지 않습니다/)).toBeVisible();
  await expect(page.getByRole("link", { name: /카카오맵에서 도보 확인/ })).toBeVisible();
  await expect(page.locator('.route-options .route-option')).toHaveCount(0);
  await expect(page.locator('.route-scope-note')).toContainText('휠체어 이동 가능 여부를 보장하지 않습니다');
});
