import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../features/routing/useMapFailureFocus.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  let layout, committed = false;
  const ref = { current: null }, events = [];
  class Element {
    constructor(owned = false) { this.owned = owned; }
    closest() { return this.owned ? this : null; }
    focus(options) { document.activeElement = this; events.push(["focus", options]); }
    scrollIntoView(options) { events.push(["scroll", options]); }
  }
  const panel = new Element(true), outside = new Element(), recovery = new Element(), body = new Element();
  const document = { activeElement: panel, body };
  const shellRef = { current: { contains: (element) => element === panel, querySelector: () => committed ? recovery : null } };
  const compiledModule = { exports: {} };
  const require = (name) => {
    assert.equal(name, "react");
    return { useCallback: (callback) => callback, useRef: () => ref, useLayoutEffect: (callback) => { layout = callback; } };
  };
  new Function("module", "exports", "require", "document", "HTMLElement", compiled)(compiledModule, compiledModule.exports, require, document, Element);
  const render = (provider) => compiledModule.exports.useMapFailureFocus(provider, shellRef);
  return { render, layout: () => layout(), commit: () => { committed = true; }, events, document, panel, outside, recovery, body };
}

test("map failure waits for the committed recovery button, then restores displaced focus visibly", () => {
  const f = fixture();
  const remember = f.render("loading");
  f.layout();
  remember();
  assert.deepEqual(f.events, []);
  f.document.activeElement = f.body;
  f.render("error");
  assert.deepEqual(f.events, []);
  f.commit();
  f.layout();
  assert.equal(f.document.activeElement, f.recovery);
  assert.deepEqual(f.events, [["focus", { preventScroll: true }], ["scroll", { block: "center", inline: "nearest", behavior: "instant" }]]);
  f.layout();
  assert.equal(f.events.length, 2, "a repeated layout does not steal focus again");
});

test("map failure leaves focus outside the removed panels untouched", () => {
  const f = fixture();
  f.document.activeElement = f.outside;
  f.render("loading")();
  f.render("error"); f.commit(); f.layout();
  assert.equal(f.document.activeElement, f.outside);
  assert.deepEqual(f.events, []);
});

test("a user moving focus before the error commit keeps that newer focus", () => {
  const f = fixture();
  f.render("loading")();
  f.document.activeElement = f.outside;
  f.render("error"); f.commit(); f.layout();
  assert.equal(f.document.activeElement, f.outside);
  assert.deepEqual(f.events, []);
});

test("an error without displaced panel focus does not focus the recovery UI", () => {
  const f = fixture();
  f.render("error"); f.commit(); f.layout();
  assert.deepEqual(f.events, []);
});
