import type { Page } from "@playwright/test";

/**
 * 화면에 실제로 그려진 색으로 대비를 잰다.
 *
 * axe-core는 배경을 확정하지 못하면 위반이 아니라 "판정 보류"로 넘긴다. 반투명
 * 배경이 겹친 자리가 많은 이 저장소에서는 그 보류가 커서, axe만 보면 위반이
 * 0으로 보이는 화면에도 읽기 어려운 글자가 남는다. 그래서 조상 배경을 알파
 * 합성해 직접 잰다.
 *
 * 배경 이미지(사진·그라디언트)가 끼면 색만으로 판단할 수 없으므로 건너뛴다.
 * 즉 이 검사는 "확실히 읽기 어려운 것"만 잡고, 못 잡는 자리가 있음을 전제한다.
 */
export type ContrastFinding = {
  ratio: number;
  where: string;
  text: string;
  size: number;
};

const MEASURE = String.raw`(() => {
  const rgba = (value) => {
    const parts = (value.match(/[\d.]+/g) || []).map(Number);
    return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (top, base) => ({
    r: top.r * top.a + base.r * (1 - top.a),
    g: top.g * top.a + base.g * (1 - top.a),
    b: top.b * top.a + base.b * (1 - top.a),
    a: 1,
  });
  const luminance = (colour) => {
    const channel = (value) => {
      const ratio = value / 255;
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b);
  };
  const contrast = (one, two) => {
    const light = Math.max(luminance(one), luminance(two));
    const dark = Math.min(luminance(one), luminance(two));
    return (light + 0.05) / (dark + 0.05);
  };
  const describe = (node) => {
    const parts = [];
    for (let item = node; item && item !== document.body && parts.length < 3; item = item.parentElement) {
      const names = item.className && typeof item.className === "string"
        ? "." + item.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
      parts.unshift(item.tagName.toLowerCase() + names);
    }
    return parts.join(" > ");
  };

  const findings = [];
  document.querySelectorAll("body *").forEach((node) => {
    const ownText = [...node.childNodes].some((child) => child.nodeType === 3 && (child.textContent || "").trim().length > 1);
    if (!ownText) return;

    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return;
    const box = node.getBoundingClientRect();
    if (!box.width || !box.height) return;

    // WCAG의 큰 글자 예외.
    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    if (size >= 24 || (bold && size >= 18.66)) return;

    const foreground = rgba(style.color);
    if (foreground.a < 0.95) return;

    const stack = [];
    let undecidable = false;
    for (let item = node; item; item = item.parentElement) {
      const own = getComputedStyle(item);
      if (own.backgroundImage && own.backgroundImage !== "none") { undecidable = true; break; }
      const colour = rgba(own.backgroundColor);
      if (colour.a > 0) stack.push(colour);
      if (colour.a >= 1) break;
    }
    if (undecidable) return;
    if (!stack.length || stack[stack.length - 1].a < 1) return;

    let base = stack[stack.length - 1];
    for (let index = stack.length - 2; index >= 0; index -= 1) base = over(stack[index], base);

    const ratio = contrast(foreground, base);
    if (ratio >= 4.5) return;
    findings.push({
      ratio: Math.round(ratio * 100) / 100,
      where: describe(node),
      text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24),
      size: Math.round(size * 10) / 10,
    });
  });
  return findings;
})()`;

/** 지연 노출된 구역까지 깨운 뒤, 대비가 4.5 미만인 글자를 모은다. */
export async function findLowContrastText(page: Page): Promise<ContrastFinding[]> {
  await page.evaluate(() => {
    document.querySelectorAll("[data-reveal],[data-land-reveal]").forEach((node) => node.classList.add("is-visible"));
  });
  await page.waitForTimeout(300);
  return page.evaluate(MEASURE) as Promise<ContrastFinding[]>;
}

export function formatFindings(path: string, findings: ContrastFinding[]) {
  return findings
    .map((item) => `${path} · 대비 ${item.ratio} · ${item.size}px · ${item.where} · "${item.text}"`)
    .join("\n");
}
