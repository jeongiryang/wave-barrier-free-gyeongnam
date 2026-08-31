import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

/**
 * `app/`은 프레임워크가 파일 경로로 직접 라우팅하고 `scripts/`는 CLI로 실행되므로
 * 임포트되지 않는 것이 정상이다. 아래 네 디렉터리는 전부 다른 모듈이 불러 써야 한다.
 */
const IMPORTED_DIRECTORIES = ["components", "features", "lib", "server"];
const SEARCH_DIRECTORIES = ["app", "components", "features", "lib", "server", "worker", "tests", "scripts"];
const CODE = /\.(?:ts|tsx|js|jsx|mjs)$/;
const SPECIFIER = /(?:^|\s)(?:import|export)[\s\S]{0,200}?from\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;

async function walk(relative) {
  const entries = await readdir(new URL(relative, ROOT), { withFileTypes: true }).catch(() => []);
  const found = [];
  for (const entry of entries) {
    const path = `${relative}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await walk(path));
    else if (CODE.test(entry.name) && !entry.name.endsWith(".d.ts")) found.push(path);
  }
  return found;
}

/** "features/a/b.ts" 기준으로 "../c/d.js" 같은 상대 경로를 저장소 기준 경로로 만든다. */
function resolveSpecifier(fromPath, specifier) {
  if (!specifier.startsWith(".")) return "";
  const segments = fromPath.split("/").slice(0, -1);
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return segments.join("/").replace(/\.(?:js|jsx|ts|tsx|mjs)$/, "");
}

test("every shared module is reachable from something that imports it", async () => {
  const owned = (await Promise.all(IMPORTED_DIRECTORIES.map(walk))).flat();
  const searchable = (await Promise.all(SEARCH_DIRECTORIES.map(walk))).flat();

  const imported = new Set();
  await Promise.all(searchable.map(async (path) => {
    const text = await readFile(new URL(path, ROOT), "utf8");
    for (const match of text.matchAll(SPECIFIER)) {
      const resolved = resolveSpecifier(path, match[1] || match[2] || "");
      if (resolved) imported.add(resolved);
    }
  }));

  const orphans = owned.filter((path) => !imported.has(path.replace(CODE, "")));
  assert.deepEqual(orphans, [], `아무도 불러 쓰지 않는 모듈이 남아 있다:\n${orphans.join("\n")}`);
});
