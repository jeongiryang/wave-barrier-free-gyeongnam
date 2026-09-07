import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { expect, test } from "@playwright/test";
import * as copy from "../features/routing/map-status-copy";

// Render the real status component with controlled provider messages that no public
// endpoint currently emits. Only preferences are injected; browser DOM resolves lang.
const require = createRequire(import.meta.url);
const code = ts.transpileModule(readFileSync(new URL("../features/routing/components/MapCommandBar.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const en of [false, true]) test(`map status language is explicit for original and selected-place messages ${en ? "English" : "Korean"}`, async ({ page }) => {
  const componentModule = { exports: {} as { default: ComponentType<Record<string, unknown>> } };
  new Function("require", "exports", "module", code)((id: string) => {
    if (id.endsWith("/SitePreferences")) return { useSitePreferences: () => ({ locale: en ? "en" : "ko" }) };
    if (id === "../map-status-copy") return copy;
    if (id === "react" || id === "react/jsx-runtime") return require(id);
    throw new Error(`Unexpected component import: ${id}`);
  }, componentModule.exports, componentModule);
  for (const message of ["외부 제공처의 별도 안내", "Provider unavailable", "검증 장소 1을 출발지로 설정했습니다.", "검증 장소 1을 목적지로 설정했습니다."]) {
    const html = renderToStaticMarkup(createElement(componentModule.exports.default, { provider: "kakao", providerDetail: message, actionNotice: "", baseMap: "roadmap" }));
    await page.setContent(`<html lang="ko"><body>${html}</body></html>`);
    const status = page.locator(".map-provider-badge strong");
    if (message.startsWith("검증")) {
      await expect(status.getByText("검증 장소 1", { exact: true })).toHaveAttribute("lang", "ko");
      const destination = message.includes("목적지");
      const phrase = en ? destination ? "Destination set to" : "Departure set to" : destination ? "을 목적지로 설정했습니다." : "을 출발지로 설정했습니다.";
      await expect(status.getByText(phrase, { exact: true })).toHaveAttribute("lang", en ? "en" : "ko");
    } else {
      const text = status.getByText(message, { exact: true });
      await expect(text).toHaveAttribute("lang", message.startsWith("Provider") ? "en" : "ko");
    }
    await expect(status).toHaveText(copy.mapStatusText(message, en));
  }
});
