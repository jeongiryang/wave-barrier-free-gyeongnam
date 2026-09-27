import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../features/tourism/hooks/useOfficialSpotImage.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture() {
  const states = [], refs = [], callbacks = [], effects = [], frames = [], timers = new Map(), calls = [];
  let timerId = 0, stateIndex = 0, refIndex = 0, callbackIndex = 0, effectIndex = 0;
  let pendingEffects = [], photo;
  let input = { src: "https://wave.test/broken.jpg", contentId: "1001", title: "Museum", region: "Changwon", tag: "Place" };
  const sameDeps = (left, right) => left?.length === right.length && right.every((value, index) => Object.is(value, left[index]));
  const mod = { exports: {} };
  new Function("module", "exports", "require", "window", code)(mod, mod.exports, name => {
    if (name === "react") return {
      useState: initial => { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], next => { states[index] = next; }]; },
      useRef: initial => { const index = refIndex++; return refs[index] ||= { current: initial }; },
      useCallback: (callback, deps) => { const index = callbackIndex++; if (!sameDeps(callbacks[index]?.deps, deps)) callbacks[index] = { callback, deps }; return callbacks[index].callback; },
      useEffect: (effect, deps) => { const index = effectIndex++; if (!sameDeps(effects[index]?.deps, deps)) pendingEffects.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() }; }); },
    };
    if (name === "../image-url") return { safeTourismImageUrl: value => value || "" };
    if (name === "../client/spot-photo") return { fetchOfficialSpotPhoto: (_query, signal) => new Promise(resolve => calls.push({ signal, resolve })) };
    throw Error(name);
  }, { requestAnimationFrame: callback => { frames.push(callback); return frames.length; }, cancelAnimationFrame: id => { frames[id - 1] = () => {}; },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; }, clearTimeout: id => timers.delete(id) });
  function render(change = {}) {
    input = { ...input, ...change };
    stateIndex = refIndex = callbackIndex = effectIndex = 0;
    pendingEffects = [];
    photo = mod.exports.useOfficialSpotImage(input);
    pendingEffects.forEach(effect => effect());
  }
  render();
  return { get photo() { return photo; }, states, frames, timers, calls, render, cleanup: () => effects.forEach(effect => effect.cleanup?.()) };
}

test("a fast successful photo stays settled through its initialization frame and timeout", () => {
  const app = fixture();
  app.photo.onLoad();
  assert.equal(app.states[1], false);
  app.frames[0]();
  assert.equal(app.states[1], false, "the decoded photo must not regain a loading skeleton");
  [...app.timers.values()].find(timer => timer.delay === 8500).callback();
  assert.equal(app.calls.length, 0, "a settled original image must not request a fallback");
  assert.equal(app.states[0], "https://wave.test/broken.jpg");
  assert.equal(app.states[2], false);
});

for (const change of [{ src: "https://wave.test/next.jpg" }, { contentId: "1002", title: "Another museum" }]) {
  test(`a new photo key resets settled state after ${change.src ? "source" : "metadata"} changes`, () => {
    const app = fixture();
    app.frames[0]();
    app.photo.onLoad();
    const oldTimeout = [...app.timers.values()].find(timer => timer.delay === 8500);
    app.render(change);
    app.frames.at(-1)();
    assert.equal(app.states[0], change.src || "https://wave.test/broken.jpg");
    assert.equal(app.states[1], true, "settlement belongs only to the previous key");
    assert.equal(app.states[2], false);
    oldTimeout.callback();
    assert.equal(app.calls.length, 0, "the old effect is cancelled");
    app.render(); // Commit the frame's new image before delivering its load event.
    app.photo.onLoad();
    [...app.timers.values()].find(timer => timer.delay === 8500).callback();
    assert.equal(app.states[1], false);
    assert.equal(app.calls.length, 0);
  });
}

test("a late load from the previous image cannot settle a new source before its frame", () => {
  const app = fixture();
  app.frames[0]();
  app.render({ src: "https://wave.test/next.jpg" });
  // React has supplied the new handler, but the img still displays the old state.
  app.photo.onLoad();
  app.frames.at(-1)();
  assert.equal(app.states[0], "https://wave.test/next.jpg");
  assert.equal(app.states[1], true);
  app.render();
  app.photo.onLoad();
  [...app.timers.values()].find(timer => timer.delay === 8500).callback();
  assert.equal(app.states[1], false);
  assert.equal(app.calls.length, 0);
});

test("a successful fallback image can settle and a new source gets a fresh retry", async () => {
  const app = fixture();
  app.frames[0]();
  app.photo.onError();
  app.calls[0].resolve("https://wave.test/fallback.jpg");
  await new Promise(resolve => setImmediate(resolve));
  app.render();
  app.photo.onLoad();
  assert.equal(app.states[0], "https://wave.test/fallback.jpg");
  assert.equal(app.states[1], false);
  [...app.timers.values()].find(timer => timer.delay === 8500).callback();
  assert.equal(app.calls.length, 1);
  app.render({ src: "https://wave.test/next.jpg" });
  app.photo.onError(); // The previous fallback is still in the DOM before this frame.
  app.frames.at(-1)();
  assert.equal(app.states[0], "https://wave.test/next.jpg");
  assert.equal(app.states[2], false);
  assert.equal(app.calls.length, 1, "the previous image's late error must not skip the new original");
  app.render();
  app.photo.onError();
  assert.equal(app.calls.length, 2);
  assert.equal(app.states[2], false, "a new original image gets its own fallback attempt");
  app.cleanup();
});

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
