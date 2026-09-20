import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function compile(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "exports", code)(name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }, exports);
  return { exports, source };
}

const data = compile("../features/planner/companion-support.ts");
const jsxRuntime = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
};
const component = compile("../features/planner/components/CompanionSupportCard.tsx", {
  "react/jsx-runtime": jsxRuntime,
  "../companion-support": data.exports,
});

function descendants(node) {
  if (!node || typeof node !== "object") return [];
  const children = [node.props?.children].flat(Infinity).filter(child => child !== undefined && child !== null && child !== false);
  return [node, ...children.flatMap(child => descendants(child))];
}

test("unapproved programs stay empty and leave no departure card", () => {
  assert.deepEqual(data.exports.companionSupportPrograms, []);
  assert.equal(component.exports.default({ programs: [] }), null);
});

test("program records allow only the public-program fields and require dated HTTPS sources", () => {
  for (const program of data.exports.companionSupportPrograms) {
    assert.match(program.url, /^https:\/\//);
    assert.match(program.checkedOn, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.match(data.source, /howToApply: string;/);
  assert.match(data.source, /checkedOn: string;/);
  for (const forbidden of ["userName", "phoneNumber", "address", "disabilityType", "eligibilityAnswer", "applicationForm"]) {
    assert.equal(data.source.includes(forbidden), false, `must not define ${forbidden}`);
  }
});

test("a confirmed fixture renders a safe official link, date and disclaimer without inputs", () => {
  const fixture = [{
    id: "confirmed-program",
    name: "확인된 공공 제도",
    institution: "공공기관",
    howToApply: "공식 안내에서 신청 방법을 확인해요.",
    url: "https://example.go.kr/program",
    noticeDays: "신청 기한은 기관 안내를 확인해요.",
    checkedOn: "2026-09-20",
  }];
  const tree = component.exports.default({ programs: fixture });
  const nodes = descendants(tree);
  const link = nodes.find(node => node.type === "a");
  assert.equal(link.props.href, fixture[0].url);
  assert.equal(link.props.target, "_blank");
  assert.equal(link.props.rel, "noopener noreferrer");
  assert.equal(nodes.some(node => ["input", "textarea", "form"].includes(node.type)), false);
  const text = nodes.flatMap(node => [node.props?.children].flat(Infinity)).filter(value => typeof value === "string").join(" ");
  assert.match(text, /확인한 날짜\s+2026-09-20/);
  assert.match(text, /W\.A\.V\.E는 안내만 해요/);
});

test("the component has no network, location, storage or submission side effects", () => {
  for (const forbidden of ["fetch(", "XMLHttpRequest", "geolocation", "localStorage", "sessionStorage", "<form", "<input", "<textarea"]) {
    assert.equal(component.source.includes(forbidden), false, `must not reference ${forbidden}`);
  }
});
