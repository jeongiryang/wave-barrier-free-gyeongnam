import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openOnsiteCommunication } from "./onsite-communication-fixtures";

type RecognitionDouble = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

async function installRecognition(page: Page, mode: "allowed" | "denied" = "allowed") {
  await page.addInitScript(selectedMode => {
    const target = window as unknown as { SpeechRecognition?: new () => RecognitionDouble; __speech?: RecognitionDouble; __starts?: number; __stops?: number };
    target.__starts = 0; target.__stops = 0;
    target.SpeechRecognition = class implements RecognitionDouble {
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
      onstart: (() => void) | null = null; onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null; onend: (() => void) | null = null;
      constructor() { target.__speech = this; }
      start() { target.__starts = (target.__starts || 0) + 1; queueMicrotask(() => selectedMode === "denied" ? this.onerror?.({ error: "not-allowed" }) : this.onstart?.()); }
      stop() { target.__stops = (target.__stops || 0) + 1; this.onend?.(); }
    };
  }, mode);
}

async function removeRecognition(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: undefined });
  });
}

test("notice precedes microphone start, results stay local, and close clears state and restores focus", async ({ page }) => {
  await installRecognition(page);
  const board = await openOnsiteCommunication(page);
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).click();
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  const trigger = board.getByRole("button", { name: "말한 내용을 글자로 보기", exact: true });
  await trigger.click();
  await expect(board.getByText(/브라우저 제조사 서버로 전송될 수 있어요/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __starts?: number }).__starts)).toBe(0);
  requests.length = 0;
  await board.getByRole("button", { name: "시작하기", exact: true }).click();
  await expect(board.getByRole("status")).toContainText("듣는 중");
  await page.evaluate(() => {
    const recognition = (window as unknown as { __speech?: RecognitionDouble }).__speech;
    recognition?.onresult?.({ resultIndex: 0, results: Object.assign([{ 0: { transcript: "입구는 오른쪽입니다" }, isFinal: true }], { length: 1 }) });
  });
  await expect(board.getByText("입구는 오른쪽입니다")).toBeVisible();
  expect(requests).toEqual([]);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(board.getByRole("status")).toContainText("멈춤");
  expect(await page.evaluate(() => (window as unknown as { __stops?: number }).__stops)).toBe(1);
  await board.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(board.getByText("입구는 오른쪽입니다", { exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include(".inquiry-dialog").analyze()).violations).toEqual([]);
});

test("unsupported browsers hide the entry", async ({ page }) => {
  await removeRecognition(page);
  const board = await openOnsiteCommunication(page);
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).click();
  await expect(board.getByRole("button", { name: "말한 내용을 글자로 보기", exact: true })).toHaveCount(0);
});

test("permission denial keeps direct input available", async ({ page }) => {
  await installRecognition(page, "denied");
  const board = await openOnsiteCommunication(page);
  await board.getByRole("button", { name: "직원에게 보여주기", exact: true }).click();
  await board.getByRole("button", { name: "말한 내용을 글자로 보기", exact: true }).click();
  await board.getByRole("button", { name: "시작하기", exact: true }).click();
  await expect(board.getByRole("alert")).toContainText("마이크를 쓸 수 없어요");
  await board.getByRole("button", { name: "지우기", exact: true }).click();
  await expect(board.getByRole("button", { name: "다시 듣기", exact: true })).toBeDisabled();
  await board.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(board.getByRole("button", { name: "직접 입력", exact: true })).toBeVisible();
});
