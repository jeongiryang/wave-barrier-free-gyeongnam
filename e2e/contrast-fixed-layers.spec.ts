import { expect, test } from "@playwright/test";
import { findLowContrastText } from "./contrast";

test("transparent fixed text is measured against its painted backing layer", async ({ page }) => {
  await page.setContent(`<style>body{margin:0;background:white}.scene{position:absolute;inset:0;background:#102b35}nav{position:fixed;top:20px;left:20px;color:white;font:16px sans-serif}nav span{display:block}</style><section class="scene"></section><nav><span>Fixed navigation</span></nav>`);
  expect(await findLowContrastText(page)).toEqual([]);
  await page.locator(".scene").evaluate(node => { (node as HTMLElement).style.background = "white"; });
  expect((await findLowContrastText(page)).map(item => item.text)).toEqual(["Fixed navigation"]);
  await page.locator("nav").evaluate(node => { (node as HTMLElement).style.background = "rgba(0,0,0,.3)"; });
  expect((await findLowContrastText(page)).map(item => item.text)).toEqual(["Fixed navigation"]);
  await page.locator("nav").evaluate(node => { (node as HTMLElement).style.background = "#102b35"; });
  expect(await findLowContrastText(page)).toEqual([]);
});
