import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const core = { info() {}, notice() {}, warning() {} };
function script(file) {
  const workflow = yaml.load(readFileSync(`.github/workflows/${file}`, "utf8"));
  return new AsyncFunction("github", "context", "core", workflow.jobs[Object.keys(workflow.jobs)[0]].steps[0].with.script);
}

test("an old issue-label event does not overwrite a newer PM status", async () => {
  let labels = ["status:blocked-human", "agent:human", "priority:P0", "human-gate", "bug"];
  const api = {
    listLabelsForRepo: async () => labels.map(name => ({ name })),
    createLabel: async () => {},
    get: async () => ({ data: { labels } }),
    removeLabel: async ({ name }) => { labels = labels.filter(label => label !== name); },
    addLabels: async (args) => { labels.push(...args.labels); },
  };
  const github = { rest: { issues: api }, paginate: async (fn, args) => fn(args) };
  const context = { repo: { owner: "owner", repo: "repo" }, issue: { number: 1 }, payload: { action: "labeled", label: { name: "status:ready-for-dev" } } };
  await script("automation-issue-router.yml")(github, context, core);
  assert.deepEqual(labels, ["status:blocked-human", "agent:human", "priority:P0", "human-gate", "bug"]);
});

test("issue opening cannot manufacture an approved priority from untrusted title", async () => {
  let labels = ["bug"];
  const api = {
    listLabelsForRepo: async () => [], createLabel: async () => {},
    get: async () => ({ data: { labels } }),
    removeLabel: async ({ name }) => { labels = labels.filter(label => label !== name); },
    addLabels: async (args) => { labels.push(...args.labels); },
  };
  const github = { rest: { issues: api }, paginate: async (fn, args) => fn(args) };
  await script("automation-issue-router.yml")(github, { repo: {}, issue: { number: 1 }, payload: { action: "opened", issue: { title: "[P0] $(unsafe input)" } } }, core);
  assert.deepEqual(labels, ["bug", "status:triage", "agent:pm", "priority:untriaged"]);
});
