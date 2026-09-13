import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function styleFiles() {
  const entries = await readdir(new URL("../app/styles/", import.meta.url));
  return ["app/globals.css", ...entries.filter((name) => name.endsWith(".css")).map((name) => `app/styles/${name}`)];
}

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

/** 선택자와 선언 묶음을 거칠게 갈라 본다. 중첩이 없는 이 저장소 스타일에 맞춘다. */
function rules(css) {
  return css
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("}")
    .map((block) => {
      const brace = block.indexOf("{");
      if (brace < 0) return null;
      return { selector: block.slice(0, brace).replace(/\s+/g, " ").trim(), body: block.slice(brace + 1) };
    })
    .filter((rule) => rule && rule.selector);
}

const LITERAL_WHITE = /^(#fff(fff)?|white)$/i;
/** 테마와 무관하게 안전한 값. */
const THEME_NEUTRAL = /^(transparent|inherit|currentcolor|unset|initial)$/i;

test("밝고 어두운 화면의 잉크와 반대색 토큰은 실제 대비 4.5 이상을 유지한다", async () => {
  const [theme, globals] = await Promise.all([
    source("app/styles/theme-itinerary-foundations.css"), source("app/globals.css"),
  ]);
  const light = rules(globals).find(rule => rule.selector.endsWith(":root"))?.body;
  const dark = rules(theme).find(rule => rule.selector === 'html[data-theme="dark"]')?.body;
  assert.ok(light && dark, "both active theme token declarations are required");
  const color = (body, name) => {
    const hex = body.match(new RegExp("--" + name + ":\\s*(#[0-9a-f]{3,6})\\b", "i"))?.[1];
    assert.ok(hex, name + " must be a concrete theme color");
    const digits = hex.slice(1).length === 3 ? [...hex.slice(1)].map(digit => digit + digit).join("") : hex.slice(1);
    assert.equal(digits.length, 6);
    const channels = [0, 2, 4].map(index => Number.parseInt(digits.slice(index, index + 2), 16) / 255);
    return channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  };
  for (const [name, body, inverted] of [["light", light, false], ["dark", dark, true]]) {
    const ink = color(body, "ink"), white = color(body, "white");
    assert.equal(ink > white, inverted, name + " must invert the foreground/background pair");
    const contrast = (Math.max(ink, white) + .05) / (Math.min(ink, white) + .05);
    assert.ok(contrast >= 4.5, name + " token contrast was " + contrast.toFixed(2));
  }
});

test("--ink 배경 위에 흰색을 직접 적지 않는다", async () => {
  // 어두운 화면에서 --ink는 밝은 색이 된다. 글자색을 #fff로 고정해 두면 밝은
  // 배경 위에 흰 글자가 남아 대비 1.11로 사실상 보이지 않는다.
  // CLAUDE.md: "어두운 구역을 밝게 바꿀 때는 안쪽 글자색도 함께 바꾼다."
  const offenders = [];
  for (const file of await styleFiles()) {
    for (const rule of rules(await source(file))) {
      if (rule.selector.includes("data-theme")) continue;
      if (!/background(?:-color)?:[^;]*var\(--ink\)/.test(rule.body)) continue;
      const color = rule.body.match(/color:\s*([^;}]+)/)?.[1]?.trim();
      if (color && LITERAL_WHITE.test(color)) {
        offenders.push(`${file} :: ${rule.selector.slice(0, 60)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `--ink 배경에 고정된 흰 글자: ${offenders.join(" / ")}`);
});

test("--blue 배경 위에도 흰색을 직접 적지 않는다", async () => {
  // 어두운 화면에서 --blue는 #0a6baf에서 #45aeea로 밝아진다. 기본 동작 버튼의
  // 글자를 #fff로 고정해 두면 대비가 2.47까지 떨어진다.
  const offenders = [];
  for (const file of await styleFiles()) {
    for (const rule of rules(await source(file))) {
      if (!/background(?:-color)?:[^;]*var\(--blue(-dark)?\)/.test(rule.body)) continue;
      const color = rule.body.match(/color:\s*([^;}]+)/)?.[1]?.trim();
      if (color && LITERAL_WHITE.test(color)) {
        offenders.push(`${file} :: ${rule.selector.slice(0, 60)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `--blue 배경에 고정된 흰 글자: ${offenders.join(" / ")}`);
});

test("--on-blue는 두 화면에서 서로 반대쪽 값을 가진다", async () => {
  const globals = await source("app/globals.css");
  const theme = await source("app/styles/theme-itinerary-foundations.css");
  assert.match(globals, /--on-blue:\s*#fff/);
  assert.match(theme, /--on-blue:\s*#04202f/);
});

test("--ink 배경에는 짝이 되는 토큰 글자색을 쓴다", async () => {
  // 배경만 토큰으로 두고 글자색을 비워도 상속된 색이 따라오지 않아 같은 사고가 난다.
  const missing = [];
  for (const file of await styleFiles()) {
    for (const rule of rules(await source(file))) {
      if (rule.selector.includes("data-theme")) continue;
      if (!/background(?:-color)?:[^;]*var\(--ink\)/.test(rule.body)) continue;
      const color = rule.body.match(/color:\s*([^;}]+)/)?.[1]?.trim();
      if (!color || THEME_NEUTRAL.test(color)) continue;
      if (!color.includes("var(--")) missing.push(`${file} :: ${rule.selector.slice(0, 60)} → ${color}`);
    }
  }
  assert.deepEqual(missing, [], `토큰이 아닌 글자색: ${missing.join(" / ")}`);
});
