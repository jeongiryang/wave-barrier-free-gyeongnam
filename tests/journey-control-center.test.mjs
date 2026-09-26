import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("여행지와 내 일정 전환은 같은 여행 상태를 쓰며 날짜가 없어도 담은 장소를 편집할 수 있다", async () => {
  const [page, header, itinerary, styles] = await Promise.all([
    source("app/planner/page.tsx"),
    source("features/planner/components/PlannerHeader.tsx"),
    source("features/planner/components/PlannerItineraryWorkspace.tsx"),
    source("app/styles/simple-planner.css"),
  ]);
  const ts = (await import("typescript")).default;
  const jsx = await import("react/jsx-runtime");
  const exports = {};
  const compiled = ts.transpileModule(header, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "exports", compiled)(name => {
    if (name === "react/jsx-runtime") return jsx;
    if (name.endsWith("/NaruHeaderScene")) return { default: "NaruHeaderScene" };
    if (name.endsWith("/WaveHeader")) return { default: "WaveHeader" };
    if (name === "./TripStorageNotice") return { default: "TripStorageNotice" };
    throw new Error("Unexpected header dependency: " + name);
  }, exports);
  const descendants = node => [node, ...[node?.props?.children].flat(Infinity).filter(Boolean).flatMap(child => typeof child === "object" ? descendants(child) : [])];
  const navigate = [];
  const render = (savedCount, activeStep, interactive = true) => descendants(exports.default({ savedCount, activeStep, interactive, storageSnapshot: {}, onNavigate: step => navigate.push(step) }));
  const empty = render(0, "conditions");
  assert.equal(empty.filter(node => node.type === "button").length, 0);
  assert.equal(empty.find(node => node.type === "WaveHeader").props.onSaved, undefined);
  for (const step of ["conditions", "places", "itinerary", "departure-readiness"]) {
    const nodes = render(2, step);
    nodes.find(node => node.type === "WaveHeader").props.onSaved();
    assert.deepEqual(navigate.splice(0), ["itinerary"]);
  }
  assert.match(page, /savedCount: tripSelection\.orderedSavedPlaces\.length/);
  assert.match(page, /currentSavedCount: planController\.resultCurrent \? activePlaces\.filter\(\(place\) => saved\.includes\(place\.id\)\)\.length : 0/);
  assert.match(page, /reviewed: reviewedTrip === reviewSignature/);
  assert.match(itinerary, /if \(!props\.tripSelection\.travelStart\) return <InitialTripSetup trip=\{props\.tripSelection\}/);
  assert.match(styles, /\.simple-stage-stream \[hidden\] \{[^}]*display: none !important/);
});

test("환경설정과 플래너 select가 44px 및 키보드 초점 계약을 가진다", async () => {
  const [preferences, hardening] = await Promise.all([
    source("app/styles/preferences.css"),
    source("app/styles/mobile-interaction-hardening.css"),
  ]);
  assert.match(preferences, /\.preference-row select \{[^}]*min-height: 44px/s);
  assert.match(preferences, /\.preference-row select:focus-visible \{[^}]*outline: 3px/s);
  assert.match(await source("app/styles/planner-flow.css"), /select,summary\):focus-visible/);
  assert.match(hardening, /outline: 3px solid #ffb800/);
});

test("모든 GitHub workflow는 Node 24 런타임 기반 action을 사용한다", async () => {
  const workflows = await Promise.all([
    ".github/workflows/ci.yml",
    ".github/workflows/cd.yml",
    ".github/workflows/release-audit.yml",
    ".github/workflows/production-api-smoke.yml",
  ].map(source));
  for (const workflow of workflows) {
    assert.match(workflow, /actions\/checkout@v7/);
    assert.match(workflow, /actions\/setup-node@v7/);
    assert.doesNotMatch(workflow, /actions\/(checkout|setup-node)@v4/);
  }
});
