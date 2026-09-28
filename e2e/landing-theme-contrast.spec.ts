import { paintedContrast } from "./painted-contrast";
import { expect, test, type Page } from "@playwright/test";
import { openLandingTools, prepareStory, storyReady } from "./landing-contract";

function luminance([red, green, blue]: number[]) {
  const channel = (value: number) => {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: number[], background: number[]) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

async function samples(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(nodes => {
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).map(Number);
    return nodes.filter(node => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }).map(node => {
      let walker: Element | null = node;
      const layers: number[][] = [];
      while (walker) { layers.push(parse(getComputedStyle(walker).backgroundColor)); walker = walker.parentElement; }
      // Composite translucent content panels over the brightest possible photo.
      const background = layers.reverse().reduce((behind, color) => behind.map((v, i) => color[i] * (color[3] ?? 1) + v * (1 - (color[3] ?? 1))), [255, 255, 255]);
      // The Naru example uses an opaque pastel gradient. backgroundColor alone
      // is transparent there, so compositing it would compare dark text with the
      // navy section hidden behind that gradient. Measure its actual pixels.
      return { background, color: parse(getComputedStyle(node).color), painted: Boolean(node.closest(".simple-naru-example")), index: nodes.indexOf(node), text: node.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || node.tagName.toLowerCase() };
    });
  });
}

async function textContrastRequirement(page: Page, selector: string) {
  const fonts = await page.locator(selector).evaluateAll(nodes => nodes.flatMap(node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const result: { size: number; weight: number; minimum: number }[] = [];
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!text.textContent?.trim() || !text.parentElement) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      const style = getComputedStyle(text.parentElement);
      if (!range.getClientRects().length || style.visibility !== 'visible') continue;
      const size = parseFloat(style.fontSize), weight = parseFloat(style.fontWeight);
      result.push({ size, weight, minimum: size >= 24 || (weight >= 700 && size >= 18.6667) ? 3 : 4.5 });
    }
    return result;
  }));
  expect(fonts, `${selector} visible text font evidence`).not.toEqual([]);
  // A combined glyph capture must meet the stricter requirement if any visible
  // descendant is smaller. A large container cannot exempt small mixed text.
  return { fonts, minimum: Math.max(...fonts.map(font => font.minimum)) };
}

const CASES = [
  ".night-hero-search [role=combobox]",
  ".simple-section-heading h2", ".simple-section-heading p", ".simple-show-regions",
  ".night-journey-input > h2", ".night-journey-input > p", ".night-journey-input h3",
  ".night-journey-tabs button", ".night-journey-input > .night-primary", ".simple-text-link",
  ".horizon-checks li", "#departure .simple-text-link", ".night-discover-card h2", ".night-discover-copy > p:not(.horizon-eyebrow)",
  ".simple-naru-story h2", ".simple-naru-story > div > p", ".simple-naru-example p",
  ".simple-naru-example-title strong", ".example-undo",

];

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 랜딩의 미리보기 글자가 표면에 묻히지 않는다`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareStory(page);
    await page.addInitScript(value => {
      sessionStorage.setItem("wave-arrival-session-v1", "done");
      localStorage.setItem("wave-theme", value);
    }, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await storyReady(page);
    for (const width of [390, 960, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("#landing-title em")).toHaveCSS("background-clip", "text");
      for (const selector of [".landing-hero-copy h1", ".landing-hero-description"]) {
        const measured = await paintedContrast(page, selector);
        const requirement = await textContrastRequirement(page, selector);
        await info.attach(`contrast-threshold-${width}-${selector}`, { body: JSON.stringify({ theme, width, selector, requirement, measured }), contentType: 'application/json' });
        expect(measured.pixels, `${width}px ${selector} glyphs`).toBeGreaterThan(0);
        expect(measured.minimum, `${width}px ${selector}`).toBeGreaterThanOrEqual(requirement.minimum);
        console.log(JSON.stringify({ theme, width, selector, requirement, ...measured }));
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: info.outputPath(`hero-${theme}-${width}.png`), animations: "disabled" });
    }
    await openLandingTools(page);
    for (const selector of ["#closing h2", "#closing .landing-closing-copy > p"]) {
      const measured = await paintedContrast(page, selector);
      const requirement = await textContrastRequirement(page, selector);
      await info.attach(`contrast-threshold-${selector}`, { body: JSON.stringify({ selector, requirement, measured }), contentType: 'application/json' });
      expect(measured.pixels).toBeGreaterThan(0);
      expect(measured.minimum, selector).toBeGreaterThanOrEqual(requirement.minimum);
    }
    for (const selector of CASES) {
      await page.locator(selector).first().scrollIntoViewIfNeeded();
      const measured = await samples(page, selector);
      const requirement = await textContrastRequirement(page, selector);
      await info.attach(`contrast-threshold-${selector}`, { body: JSON.stringify({ selector, requirement }), contentType: 'application/json' });
      expect(measured, `${selector}을 찾지 못했다`).not.toEqual([]);
      for (const sample of measured) {
        const painted = sample.painted ? await paintedContrast(page, selector, true, sample.index) : null;
        if (painted) expect(painted.pixels, `${selector} · ${sample.text} glyphs`).toBeGreaterThan(0);
        const ratio = painted ? painted.minimum : contrastRatio(sample.color, sample.background);
        expect(ratio, `${selector} · ${sample.text} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(requirement.minimum);
      }
    }
  });
}


test("painted contrast includes invisible white-on-white glyphs", async ({ page }) => {
  await page.setContent('<p id="probe" style="font:700 40px Arial;color:white;background:white;margin:0">Unreadable contrast</p>');
  const invisible = await paintedContrast(page, "#probe");
  expect(invisible.pixels).toBeGreaterThan(0);
  expect(invisible.minimum).toBe(1);
  await page.locator("#probe").evaluate(node => { (node as HTMLElement).style.color = "#000"; });
  const readable = await paintedContrast(page, "#probe");
  expect(readable.pixels).toBe(invisible.pixels);
  expect(readable.minimum).toBeGreaterThan(20);
});


test("small solid-colour glyph measurement keeps its white-on-white negative control", async ({ page }) => {
  await page.setContent('<p id="probe" style="font:13px Arial;color:white;background:white;margin:0">Small unreadable text</p>');
  const invisible = await paintedContrast(page, '#probe', true);
  expect(invisible.pixels).toBeGreaterThan(0); expect(invisible.minimum).toBe(1);
  await page.locator('#probe').evaluate(node => { (node as HTMLElement).style.color = '#000'; });
  const readable = await paintedContrast(page, '#probe', true);
  expect(readable.pixels).toBe(invisible.pixels); expect(readable.minimum).toBeGreaterThan(20);
});

test("solid-colour measurement rejects transparent fill and composited foregrounds", async ({ page }) => {
  for (const [parent, text] of [
    ['', '-webkit-text-fill-color:transparent'],
    ['', '-webkit-text-fill-color:white'],
    ['', 'opacity:.2'],
    ['opacity:.2', ''],
    ['filter:opacity(.2)', ''],
    ['mix-blend-mode:screen', ''],
  ]) {
    await page.setContent(`<div style="background:white;${parent}"><p id="probe" style="font:13px Arial;color:black;margin:0;${text}">Must not report black on white</p></div>`);
    await expect(paintedContrast(page, '#probe', true)).rejects.toThrow(/Solid-text measurement requires/);
  }
});

test("rounded fractional text masks exclude surrounding light pixels without dropping descenders", async ({ page }) => {
  await page.setContent('<div style="background:white;padding:20.5px"><p id="probe" style="font:13px/15.5px Arial;color:white;background:black;border-radius:12px;padding:6.25px 10px;width:190.5px;margin:0">gypqj 2026-09-19 – 2026-09-22</p></div>');
  const readable = await paintedContrast(page, '#probe', true);
  expect(readable.pixels).toBeGreaterThan(0);
  expect(readable.minimum).toBeGreaterThan(20);
  await page.locator('#probe').evaluate(node => { (node as HTMLElement).style.background = 'white'; });
  const invisible = await paintedContrast(page, '#probe', true);
  expect(invisible.pixels).toBe(readable.pixels);
  expect(invisible.minimum).toBe(1);
  await expect(page.locator('#probe')).toHaveCSS('border-radius', '12px');
});
