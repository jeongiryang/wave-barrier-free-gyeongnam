import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (name) => JSON.parse(readFileSync(resolve(projectRoot, name), "utf8"));

test("vinext의 취약 전이 의존성을 검증된 호환 버전으로 고정한다", () => {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const imageSizePackage = readJson("node_modules/vinext/node_modules/image-size/package.json");
  const lockedPackages = packageLock.packages;

  assert.equal(packageJson.devDependencies.vinext, "0.0.50");
  assert.equal(packageJson.overrides.vinext["image-size"], "npm:image-size-next@2.1.1");
  assert.equal(packageJson.overrides["@shuding/opentype.js"].fflate, "0.7.5");

  assert.equal(lockedPackages["node_modules/vinext/node_modules/image-size"].name, "image-size-next");
  assert.equal(lockedPackages["node_modules/vinext/node_modules/image-size"].version, "2.1.1");
  assert.match(lockedPackages["node_modules/vinext/node_modules/image-size"].integrity, /^sha512-/);
  assert.equal(lockedPackages["node_modules/fflate"].version, "0.7.5");
  assert.equal(lockedPackages["node_modules/image-size"], undefined);
  assert.equal(imageSizePackage.name, "image-size-next");
  assert.equal(imageSizePackage.version, "2.1.1");
  assert.deepEqual(imageSizePackage.dependencies ?? {}, {});
  for (const script of ["preinstall", "install", "postinstall"]) {
    assert.equal(imageSizePackage.scripts?.[script], undefined);
  }
});

test("vinext가 불러오는 이미지 판독기는 정상 입력을 처리하고 조작된 입력에서 종료한다", () => {
  const probe = String.raw`
    import { createRequire } from "node:module";
    const requireFromVinext = createRequire(import.meta.resolve("vinext"));
    const { imageSize } = requireFromVinext("image-size");
    const ascii = (value) => [...Buffer.from(value)];
    const uint32 = (value) => [value >>> 24 & 255, value >>> 16 & 255, value >>> 8 & 255, value & 255];

    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52,
      0, 0, 0, 1, 0, 0, 0, 2,
    ]);
    const dimensions = imageSize(png);
    if (dimensions.width !== 1 || dimensions.height !== 2 || dimensions.type !== "png") {
      throw new Error("image-size 호환 API가 정상 PNG를 판독하지 못했습니다.");
    }

    const craftedInputs = [
      Uint8Array.from([...ascii("icns"), ...uint32(16), ...ascii("ic07"), ...uint32(0)]),
      Uint8Array.from([
        ...uint32(12), ...ascii("JXL "), 0x0d, 0x0a, 0x87, 0x0a,
        ...uint32(20), ...ascii("ftyp"), ...ascii("jxl "), 0, 0, 0, 0, ...ascii("jxl "),
        ...uint32(0), ...ascii("junk"),
      ]),
      Uint8Array.from([
        ...uint32(24), ...ascii("ftyp"), ...ascii("avif"), 0, 0, 0, 0,
        ...ascii("avif"), ...ascii("mif1"), ...uint32(0), ...ascii("junk"),
      ]),
    ];

    for (const input of craftedInputs) {
      try {
        imageSize(input);
      } catch {
        // 잘못된 이미지가 예외를 내는 것은 정상이다. 종료하지 않는 회귀만 차단한다.
      }
    }
  `;

  const result = spawnSync(process.execPath, ["--input-type=module", "-e", probe], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 2_000,
  });

  assert.equal(result.error?.code, undefined, `이미지 판독기가 제한 시간 안에 종료되지 않았습니다: ${result.error?.message ?? ""}`);
  assert.equal(result.status, 0, result.stderr);
});
