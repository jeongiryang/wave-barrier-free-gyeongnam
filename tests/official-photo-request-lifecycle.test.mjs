import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../features/tourism/hooks/useOfficialSpotImage.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const states = [], effects = [], frames = [], timers = new Map(), calls = [];
  let timerId = 0;
  const mod = { exports: {} };
  new Function("module", "exports", "require", "window", code)(mod, mod.exports, name => {
    if (name === "react") return {
      useState: initial => { const index = states.length; states.push(typeof initial === "function" ? initial() : initial); return [states[index], next => { states[index] = next; }]; },
      useRef: initial => ({ current: initial }), useCallback: callback => callback, useEffect: effect => effects.push(effect),
    };
    if (name === "../image-url") return { safeTourismImageUrl: value => value || "" };
    if (name === "../client/spot-photo") return { fetchOfficialSpotPhoto: (_query, signal) => new Promise(resolve => calls.push({ signal, resolve })) };
    throw Error(name);
  }, { requestAnimationFrame: callback => { frames.push(callback); return frames.length; }, cancelAnimationFrame() {},
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; }, clearTimeout: id => timers.delete(id) });
  const photo = mod.exports.useOfficialSpotImage({ src: "https://wave.test/broken.jpg", contentId: "1001", title: "Museum", region: "Changwon", tag: "Place" });
  const cleanup = effects[0]();
  return { photo, states, frames, timers, calls, cleanup };
}

test("an early image decode error is not reset by the initialization frame", async () => {
  const app = fixture();
  app.photo.onError();
  app.frames[0]();
  assert.equal(app.states[0], "", "the broken original image must not be reinserted");
  app.photo.onError();
  assert.equal(app.calls.length, 1);
  app.calls[0].resolve("");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.states[1], false);
  assert.equal(app.states[2], true);
});

test("the original-image timeout cannot repeat a pending fallback request", async () => {
  const app = fixture();
  app.frames[0]();
  app.photo.onError();
  [...app.timers.values()].find(timer => timer.delay === 8500).callback();
  assert.equal(app.calls.length, 1);
  app.cleanup();
  assert.equal(app.calls[0].signal.aborted, true);
  app.calls[0].resolve("https://wave.test/late.jpg");
  await new Promise(resolve => setImmediate(resolve));
  assert.notEqual(app.states[0], "https://wave.test/late.jpg");
});
