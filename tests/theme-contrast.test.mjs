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

test("어두운 화면에서 --white는 --ink의 반대쪽에 있다", async () => {
  const theme = await source("app/styles/theme-itinerary-foundations.css");
  const globals = await source("app/globals.css");
  // 밝은 화면: --ink는 어두운 글자색, --white는 흰색.
  assert.match(globals, /--ink:\s*#06304a/);
  assert.match(globals, /--white:\s*#fff/);
  // 어두운 화면에서는 둘 다 뒤집힌다. 그래서 --ink 배경에는 --white 글자가 짝이다.
  assert.match(theme, /--ink:\s*#e8f5fb/);
  assert.match(theme, /--white:\s*#04202f/);
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
