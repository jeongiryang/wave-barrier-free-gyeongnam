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
  return page.locator(selector).evaluateAll((nodes) => {
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    return nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((node) => {
        let background = getComputedStyle(node).backgroundColor;
        let walker: Element | null = node;
        while (walker && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
          walker = walker.parentElement;
          background = walker ? getComputedStyle(walker).backgroundColor : "rgb(255, 255, 255)";
        }
        return {
          // Photo text uses a sibling scrim, not the white ancestor surface.
          // Composite the lightest stop behind the text over pure white (worst photo).
          background: parseFloat(getComputedStyle(node).webkitTextStrokeWidth) >= 2 && getComputedStyle(node).paintOrder === 'stroke'
            ? parse(getComputedStyle(node).webkitTextStrokeColor)
            : node.matches(".landing-hero-copy h1, .landing-hero-description")
            ? (() => {
                const photo = document.querySelector(".landing-opening .award-panorama")!;
                const scrim = getComputedStyle(photo, "::after");
                if (scrim.content === "none") return [255, 255, 255];
                const stops = [...scrim.backgroundImage.matchAll(/(rgba?\([^)]+\)|transparent)(?:\s+([\d.]+)%)?/g)].map((match, index, all) => ({
                  channels: match[1] === "transparent" ? [0, 0, 0, 0] : match[1].match(/[\d.]+/g)!.map(Number),
                  position: match[2] === undefined ? index / (all.length - 1) : Number(match[2]) / 100,
                }));
                if (stops.length < 2) {
                  const channels = scrim.backgroundColor.match(/[\d.]+/g)!.map(Number);
                  const alpha = channels[3] ?? 1;
                  return channels.slice(0, 3).map(channel => channel * alpha + 255 * (1 - alpha));
                }
                const frame = photo.getBoundingClientRect(), rect = node.getBoundingClientRect();
                // Only the text's actual horizontal footprint needs a protective
                // scrim. The uncovered photograph to its right carries no text.
                const left = Math.max(0, (rect.left - frame.left) / frame.width);
                const right = Math.min(1, (rect.right - frame.left) / frame.width);
                const positions = [left, right, ...stops.map(stop => stop.position).filter(x => x > left && x < right)];
                const backgrounds = positions.map(x => {
                  const end = Math.max(1, stops.findIndex(stop => stop.position >= x));
                  const start = stops[end - 1], finish = stops[end];
                  const t = Math.max(0, Math.min(1, (x - start.position) / (finish.position - start.position)));
                  // CSS gradients interpolate premultiplied alpha.
                  const alpha = (start.channels[3] ?? 1) * (1 - t) + (finish.channels[3] ?? 1) * t;
                  return [0, 1, 2].map(channel => start.channels[channel] * (start.channels[3] ?? 1) * (1 - t) + finish.channels[channel] * (finish.channels[3] ?? 1) * t + 255 * (1 - alpha));
                });
                return [0, 1, 2].map(channel => Math.max(...backgrounds.map(color => color[channel])));

              })()
            : parse(background),
          color: parse(getComputedStyle(node).color),
          text: node.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || node.tagName.toLowerCase(),
        };
      });
  });
}

const CASES = [
  ".landing-hero-copy h1", ".landing-hero-description", ".landing-actions a",
  ".simple-section-heading h2", ".simple-section-heading p", ".simple-show-regions",
  ".night-journey-input > h2", ".night-journey-input > p", ".night-journey-input h3",
  ".night-journey-tabs button", ".night-journey-input > .night-primary", ".simple-text-link",
  ".horizon-checks li", "#departure .simple-text-link", ".night-discover-card h2", ".night-discover-copy > p",
  ".simple-naru-story h2", ".simple-naru-story > div > p", ".simple-naru-example p",
  ".simple-naru-example-title small", ".example-undo",
  "#closing h2", "#closing .landing-closing-copy > p",
];

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 랜딩의 미리보기 글자가 표면에 묻히지 않는다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareStory(page);
    await page.addInitScript(value => {
      sessionStorage.setItem("wave-arrival-session-v1", "done");
      localStorage.setItem("wave-theme", value);
    }, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await storyReady(page);
    await openLandingTools(page);
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
