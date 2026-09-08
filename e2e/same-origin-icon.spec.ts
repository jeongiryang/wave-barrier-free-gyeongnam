import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("browser icons use the current deployment while canonical metadata stays public", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await mockPublicShellApi(page);
  await page.goto("/");
  for (const rel of ["icon", "shortcut icon"]) {
    const icon = page.locator(`head link[rel="${rel}"]`);
    await expect(icon).toHaveCount(1);
    await expect(icon).toHaveAttribute("href", "/favicon.svg");
    expect(await icon.evaluate(node => new URL((node as HTMLLinkElement).href).origin)).toBe(new URL(page.url()).origin);
  }
  const response = await request.get("/favicon.svg");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/svg+xml");
  expect(await response.text()).toContain("<svg");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://wave-barrier-free-gyeongnam.vercel.app/");
  expect(errors).toEqual([]);
});
