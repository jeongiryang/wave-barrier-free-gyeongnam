import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const ROOTS = ["app", "components", "features", "lib"];
const SOURCE_SUFFIXES = [".ts", ".tsx", ".js", ".jsx", ".mjs"];

async function walk(dir, files = []) {
  const entries = await readdir(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true });
  for (const entry of entries) {
    const next = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(next, files);
    else if (SOURCE_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) files.push(next);
  }
  return files;
}

async function sourceBundle() {
  const files = [];
  for (const root of ROOTS) await walk(root, files);
  const parts = await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")));
  return parts.join("\n");
}

/** `localStorage.setItem("키"` 처럼 곧바로 문자열이 오는 호출에서 키를 모은다. */
function storageKeys(bundle, method) {
  const keys = new Set();
  for (const store of ["localStorage", "sessionStorage"]) {
    const needle = `${store}.${method}(`;
    let at = bundle.indexOf(needle);
    while (at !== -1) {
      const rest = bundle.slice(at + needle.length).trimStart();
      const quote = rest[0];
      if (quote === '"' || quote === "'" || quote === "`") {
        const end = rest.indexOf(quote, 1);
        if (end > 1) keys.add(rest.slice(1, end));
      }
      at = bundle.indexOf(needle, at + needle.length);
    }
  }
  return keys;
}

test("브라우저에 저장한 값은 다시 읽는 곳이 있어야 한다", async () => {
  // 읽는 곳 없이 저장만 하면 화면은 "저장했습니다"라고 말하지만 아무 일도
  // 일어나지 않는다. 사용자는 저장됐다고 믿고 다시 와서 아무것도 찾지 못한다.
  const bundle = await sourceBundle();
  const written = storageKeys(bundle, "setItem");
  const read = storageKeys(bundle, "getItem");

  assert.ok(written.size > 0, "저장 키를 하나도 찾지 못했다면 검사 자체가 잘못됐다");
  const orphans = [...written].filter((key) => !read.has(key));
  assert.deepEqual(orphans, [], `읽는 곳이 없는 저장 키: ${orphans.join(", ")}`);
});

test("읽기만 하고 아무도 채우지 않는 저장 키는 없어야 한다", async () => {
  const bundle = await sourceBundle();
  const written = storageKeys(bundle, "setItem");
  const read = storageKeys(bundle, "getItem");
  const empties = [...read].filter((key) => !written.has(key));
  assert.deepEqual(empties, [], `아무도 채우지 않는 읽기 키: ${empties.join(", ")}`);
});
