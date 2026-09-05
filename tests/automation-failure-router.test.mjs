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

test("failure event re-delivery creates one issue and one receipt per attempt", async () => {
  const issues = []; const comments = [];
  const run = { id: 123, run_attempt: 1, name: "CI", path: ".github/workflows/ci.yml", conclusion: "failure", repository: { full_name: "owner/repo" }, head_branch: "feature", head_sha: "a".repeat(40), html_url: "https://github.com/owner/repo/actions/runs/123", pull_requests: [{ number: 7 }] };
  const api = {
    listForRepo: async () => issues,
    listComments: async () => comments,
    create: async ({ body, title }) => { const item = { number: issues.length + 1, title, body, user: { login: "github-actions[bot]" } }; issues.push(item); return { data: item }; },
    createComment: async ({ body }) => { comments.push({ body, user: { login: "github-actions[bot]" } }); },
  };
  const github = { rest: { issues: api, actions: { getWorkflowRun: async () => ({ data: run }) } }, paginate: async (fn, args) => fn(args) };
  const context = { repo: { owner: "owner", repo: "repo" }, payload: { workflow_run: run, repository: { full_name: "owner/repo" } } };
  const route = script("automation-failure-router.yml");
  await route(github, context, core); await route(github, context, core);
  assert.equal(issues.length, 1); assert.equal(comments.length, 0);
  run.run_attempt = 2;
  await route(github, context, core); await route(github, context, core);
  assert.equal(issues.length, 1); assert.equal(comments.length, 1);
  run.conclusion = "success"; await route(github, context, core);
  assert.equal(comments.length, 1);
  run.conclusion = "failure"; run.path = ".github/workflows/automation-failure-router.yml";
  await route(github, context, core); assert.equal(issues.length, 1);
});
