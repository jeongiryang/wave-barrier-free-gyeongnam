import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../features/routing/export-route-image.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function imageExport({ contextAvailable = true, encodeThrows = false, clickThrows = false } = {}) {
  let finish;
  let clicks = 0;
  const revoked = [], captions = [], pins = [];
  const context = new Proxy({
    createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 40 }),
    fillText: (text) => captions.push(text),
    arc: (x, y) => pins.push({ x, y }),
  }, { get: (target, key) => target[key] ?? (() => undefined) });
  const canvas = {
    getContext: () => contextAvailable ? context : null,
    toBlob: (callback) => { if (encodeThrows) throw new Error("encoding denied"); finish = callback; },
  };
  const document = { createElement: (tag) => tag === "canvas" ? canvas : { click() { if (clickThrows) throw new Error("download denied"); clicks++; } } };
  const compiledModule = { exports: {} };
  const URL = { createObjectURL: () => "blob:fixture", revokeObjectURL: (url) => revoked.push(url) };
  new Function("module", "exports", "document", "URL", "window", compiled)(compiledModule, compiledModule.exports, document, URL, { setTimeout: (callback) => callback() });
  const run = (options = {}) => compiledModule.exports.exportRouteImage({ origin: { lat: 35.2, lng: 128.6 }, places: [], route: null, format: "png", ...options });
  return { run, complete: (blob) => finish(blob), clicks: () => clicks, revoked, captions, pins };
}

test("an image is not reported ready until encoding and the download request succeed", async () => {
  const fixture = imageExport();
  const result = fixture.run();
  assert.equal(typeof result?.then, "function");
  let settled = false;
  result.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(fixture.clicks(), 0);
  fixture.complete(new Blob(["image"]));
  assert.equal(await result, true);
  assert.equal(fixture.clicks(), 1);
  assert.deepEqual(fixture.revoked, ["blob:fixture"]);
});

test("an empty encoded image is a failure and never requests a download", async () => {
  const fixture = imageExport();
  const result = fixture.run();
  fixture.complete(null);
  assert.equal(await result, false);
  assert.equal(fixture.clicks(), 0);
});

test("missing canvas support and synchronous encoding errors are recoverable failures", async () => {
  assert.equal(await imageExport({ contextAvailable: false }).run(), false);
  assert.equal(await imageExport({ encodeThrows: true }).run(), false);
});

test("download request failure revokes the temporary image and reports failure", async () => {
  const fixture = imageExport({ clickThrows: true });
  const result = fixture.run();
  fixture.complete(new Blob(["image"]));
  assert.equal(await result, false);
  assert.deepEqual(fixture.revoked, ["blob:fixture"]);
});

test("the exported image labels its schematic and accessibility limits in both languages", async () => {
  for (const locale of ["ko", "en"]) {
    const fixture = imageExport();
    const result = fixture.run({ locale });
    fixture.complete(new Blob(["image"]));
    assert.equal(await result, true);
    const copy = fixture.captions.join(" ");
    assert.match(copy, locale === "en" ? /not an accessible-route guarantee/i : /무장애 이동을 보장하지/);
    assert.match(copy, locale === "en" ? /schematic/i : /안내도/);
    assert.doesNotMatch(copy, /경남 무장애 여행 경로/);
  }
});

test("a selected origin outside the supplied route geometry remains inside the image", async () => {
  const fixture = imageExport();
  const result = fixture.run({ route: { geometry: [{ lat: 35.3, lng: 128.7 }, { lat: 35.4, lng: 128.8 }] } });
  fixture.complete(new Blob(["image"]));
  assert.equal(await result, true);
  assert.equal(fixture.pins.length, 1);
  assert.ok(fixture.pins.every(({ x, y }) => x >= 140 && x <= 1460 && y >= 210 && y <= 820));
});
