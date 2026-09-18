import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

type AssistantRequest = { messages: Array<{ role: string; content: string }>; context: Record<string, unknown> };

async function setup(page: Page) {
  const requests: AssistantRequest[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route("**/api/assistant", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true } });
    const payload = route.request().postDataJSON() as AssistantRequest;
    requests.push(payload);
    await route.fulfill({ json: { reply: "합성 모델 응답입니다.", proposal: null, source: "local-llm" } });
  });
  await page.goto("/planner");
  const launcher = page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true });
  await expect(launcher).toBeEnabled();
  await launcher.click();
  const chat = page.getByRole("dialog", { name: "WAVE 여행 가이드 나루와 대화", exact: true });
  await expect(chat).toBeVisible();
  const skip = chat.getByRole("button", { name: "건너뛰기", exact: true });
  if (await skip.count()) await skip.click();
  return { requests, errors, chat };
}

async function ask(page: Page, chat: ReturnType<Page["getByRole"]>, text: string) {
  await chat.getByRole("textbox", { name: "나루에게 여행 질문하기" }).fill(text);
  await chat.getByRole("button", { name: "나루에게 보내기", exact: true }).click();
  await expect(page.getByText("합성 모델 응답입니다.").last()).toBeVisible();
}

async function switchTone(page: Page) {
  await openSupportMenu(page);
  const details = page.locator(".preference-controls");
  await expect(details).toHaveAttribute("aria-busy", "false");
  await details.locator("summary").click();
  await details.locator("[data-preference='tone']").click();
  await expect(page.locator("html")).toHaveAttribute("data-tone", "gyeongnam");
  await page.keyboard.press("Escape");
}

test("설정 하나로 나루 요청의 tone이 바뀌고 대화 기록은 유지된다", async ({ page }) => {
  const { requests, errors, chat } = await setup(page);
  await ask(page, chat, "창원 여행지를 찾아줘");
  expect(requests.at(-1)!.context.tone).toBe("standard");
  const before = await chat.locator(".naru-message").count();

  // 나루 대화는 모달이므로 설정을 바꾸려면 잠시 닫는다.
  await chat.getByRole("button", { name: "나루 대화 닫기", exact: true }).click();
  await switchTone(page);
  await page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true }).click();
  await expect(chat).toBeVisible();
  // 말투를 바꿔도 대화 기록이 지워지지 않는다.
  await expect(chat.locator(".naru-message")).toHaveCount(before);
  await expect(chat.getByText("창원 여행지를 찾아줘")).toBeVisible();

  // 말투는 다음 요청부터 적용된다. 이미 받은 답을 다시 만들지 않는다.
  expect(requests).toHaveLength(1);
  await ask(page, chat, "일정에서 확인할 것을 알려줘");
  expect(requests.at(-1)!.context.tone).toBe("gyeongnam");
  expect(errors).toEqual([]);
});

test("나루 요청에 위치 관련 필드가 없고 나루 화면에 말투 표시를 두지 않는다", async ({ page }) => {
  const { requests, chat } = await setup(page);
  await ask(page, chat, "창원 여행지를 찾아줘");
  const body = JSON.stringify(requests.at(-1));
  for (const field of ["latitude", "longitude", "coords", "accuracy", "geolocation"]) {
    expect(body, `요청에 위치 필드가 있습니다: ${field}`).not.toContain(field);
  }
  await expect(chat.getByText("경남 말", { exact: false })).toHaveCount(0);
  await expect(chat.getByText("표준말", { exact: false })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include(".naru-panel").analyze()).violations).toEqual([]);
});

test("오류 문구는 말투와 무관하게 표준말이다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.route("**/api/assistant", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true } });
    await route.fulfill({ status: 429, json: { error: "나루가 다른 답변을 마무리하고 있어요. 잠시 뒤 다시 보내주세요.", code: "AI_BUSY" } });
  });
  await page.goto("/planner");
  const launcher = page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true });
  await expect(launcher).toBeEnabled();
  await switchTone(page);
  await launcher.click();
  const chat = page.getByRole("dialog", { name: "WAVE 여행 가이드 나루와 대화", exact: true });
  const skip = chat.getByRole("button", { name: "건너뛰기", exact: true });
  if (await skip.count()) await skip.click();
  await chat.getByRole("textbox", { name: "나루에게 여행 질문하기" }).fill("창원 여행지를 찾아줘");
  await chat.getByRole("button", { name: "나루에게 보내기", exact: true }).click();
  await expect(chat.getByText("나루가 다른 답변을 마무리하고 있어요", { exact: false })).toBeVisible();
  expect(errors).toEqual([]);
});
