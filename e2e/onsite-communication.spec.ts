import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openOnsiteCommunication } from "./onsite-communication-fixtures";

test("offline entry, fixed answer, ask again and end stay within one accessible dialog", async ({ page }) => {
  const board = await openOnsiteCommunication(page, true);
  const relay = board.getByRole("link", { name: "문자·수어 통화 도움", exact: true });
  await expect(relay).toHaveAttribute("href", "https://mail.relaycall.or.kr/user/main");
  await expect(relay).toHaveAttribute("target", "_blank");
  await expect(relay).toHaveAttribute("rel", "noopener noreferrer");
  await board.getByRole("button", { name: "계단 없는 입구", exact: true }).click();
  await expect(board.locator(".inquiry-card-preview")).toContainText("계단 없는 입구를 안내해 주세요.");
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).click();
  await expect(board.getByText("답을 골라 주세요.", { exact: true })).toBeVisible();
  await board.getByRole("button", { name: "왼쪽에 있어요", exact: true }).click();
  await expect(board.getByRole("heading", { name: "직원이 고른 답이에요", exact: true })).toBeFocused();
  await expect(board.locator("[aria-live=assertive]")).toHaveText("왼쪽에 있어요");
  await board.getByRole("button", { name: "다시 질문", exact: true }).click();
  await expect(board.locator(".inquiry-card-preview")).toContainText("계단 없는 입구를 안내해 주세요.");
  await board.getByRole("button", { name: "대화 끝내기", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "이렇게 물어보세요." })).toBeVisible();
  await expect(page.getByRole("button", { name: "화면으로 대화", exact: true })).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "운영·입장 시간", exact: true })).toBeChecked();
});

test("custom answer validates input and renders it as text", async ({ page }) => {
  const board = await openOnsiteCommunication(page);
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).click();
  await board.getByRole("button", { name: "직접 입력", exact: true }).click();
  await board.getByRole("button", { name: "답변 확정", exact: true }).click();
  await expect(board.getByRole("status")).toHaveText("답변을 입력하거나 취소해 주세요.");
  const answer = "  <img src=x onerror=alert(1)> 제가 안내할게요.  ";
  await board.getByRole("textbox", { name: "직접 입력", exact: true }).fill(answer);
  await board.getByRole("button", { name: "답변 확정", exact: true }).click();
  await expect(board.locator("[aria-live=assertive]")).toHaveText(answer.trim());
  await expect(board.locator("img")).toHaveCount(0);
});

test("door topic works offline without a network request and restores focus", async ({ page }) => {
  const requests: string[] = [];
  const board = await openOnsiteCommunication(page, true, () => page.on("request", request => requests.push(request.url())));
  await board.getByRole("button", { name: "출입문 도움", exact: true }).click();
  await expect(board.locator(".inquiry-card-preview")).toContainText("문을 열기 어려워요. 도와주시거나 다른 출입구를 알려 주세요.");
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).click();
  await expect(board.locator(".communication-answer-grid button")).toHaveCount(6);
  await board.getByRole("button", { name: "제가 안내할게요", exact: true }).click();
  await expect(board.getByRole("heading", { name: "직원이 고른 답이에요", exact: true })).toBeFocused();
  expect(requests).toEqual([]);
  expect((await new AxeBuilder({ page }).include(".inquiry-dialog").analyze()).violations).toEqual([]);
  await board.getByRole("button", { name: "대화 끝내기", exact: true }).click();
  await expect(page.getByRole("button", { name: "화면으로 대화", exact: true })).toBeFocused();
});

test("keyboard, Escape and rotation work at a 320px reflow viewport", async ({ page }) => {
  const board = await openOnsiteCommunication(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(board.getByRole("button", { name: "왼쪽에 있어요", exact: true })).toBeVisible();
  await board.getByRole("button", { name: "화면 돌리기", exact: true }).click();
  await expect(board.locator(".communication-staff-board")).toHaveClass(/is-rotated/);
  await board.getByRole("button", { name: "제가 안내할게요", exact: true }).click();
  await board.getByRole("button", { name: "다시 질문", exact: true }).click();
  await board.getByRole("button", { name: "대화 끝내기", exact: true }).click();
  await page.getByRole("button", { name: "화면으로 대화", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "직원과 화면으로 대화", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await board.screenshot({ path: test.info().outputPath("onsite-communication-320px.png") });
  expect((await new AxeBuilder({ page }).include(".inquiry-dialog").analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator(".inquiry-dialog")).toHaveCount(0);
  await expect(page.locator(".native-place-dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /문의 카드 만들기/ })).toBeFocused();
});
