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

/** Render the glyph, its actual backdrop and an opaque glyph mask. Canvas decodes
 * Playwright's PNG bytes in the browser; no PNG package or external media call.
 * Keep shadows in the backdrop, but never discard equal foreground/background
 * pixels: white-on-white must fail rather than disappear from the sample. */
async function paintedContrast(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const painted = await target.screenshot({ animations: "disabled" });
  const styles = await target.evaluate(node => [node, ...node.querySelectorAll("*")].map(el => el.getAttribute("style")));
  let background: Buffer, mask: Buffer;
  try {
    await target.evaluate(node => [node, ...node.querySelectorAll<HTMLElement>("*")].forEach(el => {
      const style = (el as HTMLElement).style;
      if (getComputedStyle(el).backgroundClip === "text") style.setProperty("background-image", "none", "important");
      style.setProperty("color", "transparent", "important");
      style.setProperty("-webkit-text-fill-color", "transparent", "important");
    }));
    background = await target.screenshot({ animations: "disabled" });
    await target.evaluate(node => {
      [node, ...node.querySelectorAll<HTMLElement>("*")].forEach(el => {
        const style = (el as HTMLElement).style;
        for (const [name, value] of Object.entries({ color: "#fff", "-webkit-text-fill-color": "#fff", "text-shadow": "none", "background-image": "none", "background-color": "transparent" })) style.setProperty(name, value, "important");
      });
      (node as HTMLElement).style.setProperty("background-color", "#000", "important");
      (node as HTMLElement).style.setProperty("background-clip", "border-box", "important");
    });
    mask = await target.screenshot({ animations: "disabled" });
  } finally {
    await target.evaluate((node, saved) => [node, ...node.querySelectorAll("*")].forEach((el, i) => saved[i] === null ? el.removeAttribute("style") : el.setAttribute("style", saved[i]!)), styles);
  }
  return page.evaluate(async data => {
    const decode = async (base64: string) => {
      const image = new Image(); image.src = "data:image/png;base64," + base64; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    };
    const [paint, back, glyph] = await Promise.all(data.map(decode));
    if (paint.width !== back.width || paint.height !== back.height || paint.width !== glyph.width || paint.height !== glyph.height) throw new Error("Contrast captures changed geometry");
    const luminance = (rgb: number[]) => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    let minimum = Infinity, pixels = 0;
    for (let offset = 0; offset < glyph.data.length; offset += 4) {
      // Exclude antialiased edges, not low-contrast fully painted glyph interiors.
      if ([0, 1, 2].some(i => glyph.data[offset + i] < 254)) continue;
      const a = luminance(Array.from(paint.data.slice(offset, offset + 3)));
      const b = luminance(Array.from(back.data.slice(offset, offset + 3)));
      minimum = Math.min(minimum, (Math.max(a, b) + .05) / (Math.min(a, b) + .05)); pixels++;
    }
    return { minimum, pixels };
  }, [painted.toString("base64"), background!.toString("base64"), mask!.toString("base64")]);
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
      return { background, color: parse(getComputedStyle(node).color), text: node.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || node.tagName.toLowerCase() };
    });
  });
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
        expect(measured.pixels, `${width}px ${selector} glyphs`).toBeGreaterThan(0);
        expect(measured.minimum, `${width}px ${selector}`).toBeGreaterThanOrEqual(4.5);
        console.log(JSON.stringify({ theme, width, selector, ...measured }));
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: info.outputPath(`hero-${theme}-${width}.png`), animations: "disabled" });
    }
    await openLandingTools(page);
    for (const selector of ["#closing h2", "#closing .landing-closing-copy > p"]) {
      const measured = await paintedContrast(page, selector);
      expect(measured.pixels).toBeGreaterThan(0);
      expect(measured.minimum, selector).toBeGreaterThanOrEqual(4.5);
    }
    for (const selector of CASES) {
      await page.locator(selector).first().scrollIntoViewIfNeeded();
      const measured = await samples(page, selector);
      expect(measured, `${selector}을 찾지 못했다`).not.toEqual([]);
      for (const sample of measured) {
        const ratio = contrastRatio(sample.color, sample.background);
        expect(ratio, `${selector} · ${sample.text} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
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
