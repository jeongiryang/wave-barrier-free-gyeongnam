import { expect, test, type Page } from "@playwright/test";

/** Render the glyph, its actual backdrop and an opaque glyph mask. Canvas decodes
 * Playwright's PNG bytes in the browser; no PNG package or external media call.
 * Keep shadows in the backdrop, but never discard equal foreground/background
 * pixels: white-on-white must fail rather than disappear from the sample. */
export async function paintedContrast(page: Page, selector: string, solidText = false) {
  const target = page.locator(selector).first();
  await page.evaluate(() => document.fonts.ready);
  await target.scrollIntoViewIfNeeded();
  // Entry animation can move child glyphs without moving the measured container.
  // Finish that real entry before comparing the same pixels across three captures.
  await expect.poll(() => target.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity).length)).toBe(0);
  const solidColor = solidText ? await target.evaluate(node => {
    const style = getComputedStyle(node), color = (style.color.match(/[\d.]+/g) || []).map(Number);
    if (color.length < 3 || (color[3] ?? 1) !== 1 || style.backgroundClip === 'text') throw new Error('Solid-text measurement requires an opaque text colour');
    for (const element of [node, ...node.querySelectorAll('*')]) {
      const text = getComputedStyle(element);
      if (text.color !== style.color || text.webkitTextFillColor !== style.color || parseFloat(text.webkitTextStrokeWidth) !== 0) throw new Error('Solid-text measurement requires matching opaque text fill');
    }
    const layers = new Set<Element>([node, ...node.querySelectorAll('*')]);
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) layers.add(ancestor);
    for (const element of layers) {
      const layer = getComputedStyle(element);
      if (Number(layer.opacity) !== 1 || layer.filter !== 'none' || layer.mixBlendMode !== 'normal') throw new Error('Solid-text measurement requires unmodified opaque compositing');
    }
    return color.slice(0, 3);
  }) : null;
  const geometry = () => target.evaluate(node => {
    const box = node.getBoundingClientRect();
    return [box.x, box.y, box.width, box.height, scrollX, scrollY];
  });
  const origin = await geometry();
  const capture = async () => {
    const shot = await target.screenshot({ animations: "disabled" });
    if (JSON.stringify(await geometry()) !== JSON.stringify(origin)) throw new Error('Contrast captures changed position or scroll');
    return shot;
  };
  const painted = await capture();
  const styles = await target.evaluate(node => [node, ...node.querySelectorAll("*")].map(el => el.getAttribute("style")));
  let background: Buffer, mask: Buffer;
  try {
    await target.evaluate(node => [node, ...node.querySelectorAll<HTMLElement>("*")].forEach(el => {
      const style = (el as HTMLElement).style;
      if (getComputedStyle(el).backgroundClip === "text") style.setProperty("background-image", "none", "important");
      style.setProperty("color", "transparent", "important");
      style.setProperty("-webkit-text-fill-color", "transparent", "important");
    }));
    background = await capture();
    await target.evaluate(node => {
      [node, ...node.querySelectorAll<HTMLElement>("*")].forEach(el => {
        const style = (el as HTMLElement).style;
        for (const [name, value] of Object.entries({ color: "#fff", "-webkit-text-fill-color": "#fff", "text-shadow": "none", "background-image": "none", "background-color": "transparent" })) style.setProperty(name, value, "important");
      });
      (node as HTMLElement).style.setProperty("background-color", "#000", "important");
      (node as HTMLElement).style.setProperty("background-clip", "border-box", "important");
      // The mask is only glyph geometry. Rounded corners and fractional capture
      // padding must not expose a bright photograph and masquerade as glyphs.
      // The outer shadow paints behind overflowing descenders; an outline would
      // cover their last pixels. Keep every row rather than cropping the edge.
      (node as HTMLElement).style.setProperty("border-radius", "0", "important");
      (node as HTMLElement).style.setProperty("outline", "none", "important");
      (node as HTMLElement).style.setProperty("box-shadow", "0 0 0 2px #000", "important");
    });
    mask = await capture();
  } finally {
    await target.evaluate((node, saved) => [node, ...node.querySelectorAll("*")].forEach((el, i) => saved[i] === null ? el.removeAttribute("style") : el.setAttribute("style", saved[i]!)), styles);
  }
  const measured = await page.evaluate(async data => {
    const decode = async (base64: string) => {
      const image = new Image(); image.src = "data:image/png;base64," + base64; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height);
    };
    const [paint, back, glyph] = await Promise.all(data.images.map(decode));
    if (paint.width !== back.width || paint.height !== back.height || paint.width !== glyph.width || paint.height !== glyph.height) throw new Error("Contrast captures changed geometry");
    const luminance = (rgb: number[]) => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    let minimum = Infinity, pixels = 0, worst = { x: 0, y: 0, foreground: [] as number[], background: [] as number[] };
    for (let offset = 0; offset < glyph.data.length; offset += 4) {
      // Solid-colour small text may contain no fully opaque raster pixel.
      // WCAG excludes anti-aliasing: use its verified opaque CSS colour, while
      // the mask still restricts backdrop sampling to the actual glyph strokes.
      // Gradient text keeps fully covered painted pixels, including equal fg/bg.
      if ([0, 1, 2].some(i => glyph.data[offset + i] < (data.solidColor ? 128 : 254))) continue;
      const foreground = data.solidColor ?? Array.from(paint.data.slice(offset, offset + 3));
      const a = luminance(foreground);
      const b = luminance(Array.from(back.data.slice(offset, offset + 3)));
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      if (ratio < minimum) { minimum = ratio; worst = { x: (offset / 4) % paint.width, y: Math.floor(offset / 4 / paint.width), foreground, background: Array.from(back.data.slice(offset, offset + 3)) }; } pixels++;
    }
    return { minimum, pixels, worst };
  }, { images: [painted.toString("base64"), background!.toString("base64"), mask!.toString("base64")], solidColor });
  if (measured.minimum < 4.5) {
    for (const [name, body] of [["paint", painted], ["background", background!], ["mask", mask!]] as const) await test.info().attach(`contrast-${name}`, { body, contentType: "image/png" });
    await test.info().attach("contrast-measurement", { body: JSON.stringify(measured), contentType: "application/json" });
  }
  return measured;
}
