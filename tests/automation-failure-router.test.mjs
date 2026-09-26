// Archived automation contract; current release CI is verified in release-harness.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const core = { info() {}, notice() {}, warning() {} };

test("only a verified superseded cancellation with no real failure avoids issue triage", async () => {
  const route = script("automation-failure-router.yml");
  for (const scenario of ['superseded', 'newer failed', 'derived gate failure', 'unexpected gate failure', 'failed job', 'failed step', 'no successor', 'different PR', 'different repo', 'different workflow', 'manual main cancellation', 'lookup failure', 'unknown job']) {
    const run = {id:123,workflow_id:10,run_attempt:1,name:'CI',path:'.github/workflows/ci.yml',event:'pull_request',conclusion:'cancelled',repository:{full_name:'owner/repo'},head_repository:{full_name:'owner/repo'},head_branch:'feature',pull_requests:[{number:7}]};
    const next = {...structuredClone(run),id:124,conclusion:scenario === 'newer failed' ? 'failure' : null};
    const jobs = [{conclusion:'cancelled',steps:[{conclusion:'success'},{conclusion:'cancelled'}]}];
    if (scenario === 'derived gate failure') jobs.push({name:'validate',conclusion:'failure',steps:[{name:'모든 검증 결과 확인',conclusion:'failure'}]});
    if (scenario === 'unexpected gate failure') jobs.push({name:'validate',conclusion:'failure',steps:[{name:'Set up job',conclusion:'failure'}]});
    if (scenario === 'failed job') jobs[0].conclusion = 'failure';
    if (scenario === 'failed step') jobs[0].steps[0].conclusion = 'failure';
    if (scenario === 'unknown job') jobs[0].conclusion = null;
    if (scenario === 'different PR') next.pull_requests[0].number = 8;
    if (scenario === 'different repo') next.head_repository.full_name = 'outside/fork';
    if (scenario === 'different workflow') next.workflow_id = 11;
    if (scenario === 'manual main cancellation') run.event = 'push';
    let writes = 0;
    const github = {rest:{actions:{getWorkflowRun:async()=>({data:run}),listJobsForWorkflowRun:async()=>jobs,listWorkflowRuns:async()=>{
      if(scenario === 'lookup failure') throw new Error('unavailable');
      return {data:{workflow_runs:scenario === 'no successor' ? [] : [next]}};
    }},issues:{listForRepo:async()=>[],create:async()=>{writes++;return {data:{number:1}};}}},paginate:async(fn,args)=>fn(args)};
    const context = {repo:{owner:'owner',repo:'repo'},payload:{workflow_run:run,repository:{full_name:'owner/repo'}}};
    await route(github,context,core);
    assert.equal(writes, ['superseded','newer failed','derived gate failure'].includes(scenario) ? 0 : 1, scenario);
    // Suppressing an older cancellation must not swallow the replacement's failure.
    if (scenario === 'newer failed') {
      Object.assign(run, next);
      await route(github,context,core);
      assert.equal(writes,1);
    }
  }
});
function script(file) {
  const workflow = yaml.load(readFileSync(`.github/workflow-archive/2026-09-26/workflows/${file}`, "utf8"));
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

test("a skipped downstream run cannot create a failure issue even when its event claims failure", async () => {
  const run = { id: 34187870681, name: "CD", path: ".github/workflows/cd.yml", conclusion: "skipped", repository: { full_name: "owner/repo" } };
  let reads = 0;
  const unexpected = async () => assert.fail("A skipped run must not read or mutate the issue queue");
  const github = {
    rest: {
      actions: { getWorkflowRun: async () => { reads += 1; return { data: run }; } },
      issues: { listForRepo: unexpected, listComments: unexpected, create: unexpected, createComment: unexpected },
    },
    paginate: unexpected,
  };
  const context = { repo: { owner: "owner", repo: "repo" }, payload: { workflow_run: { id: run.id, conclusion: "failure" }, repository: { full_name: "owner/repo" } } };
  const route = script("automation-failure-router.yml");
  await route(github, context, core);
  run.name = "Post-Deploy Production QA";
  run.path = ".github/workflows/automation-post-deploy-qa.yml";
  await route(github, context, core);
  assert.equal(reads, 2);
});

test("verified provider-only failures do not create repeated code tasks; mixed, fork and unrecorded failures still triage", async () => {
  const run = {id:123,run_attempt:1,name:"Post-Deploy Production QA",path:".github/workflows/automation-post-deploy-qa.yml",conclusion:"failure",repository:{full_name:"owner/repo"},head_repository:{full_name:"owner/repo"},head_branch:"main",head_sha:"a".repeat(40),pull_requests:[]};
  const jobs = [{name:"verify",conclusion:"failure",steps:[{name:"Provider hold preflight",conclusion:"failure"},{name:"읽기 전용 Production 사용자 여정·접근성 smoke",conclusion:"success"}]},{name:"provider-hold",conclusion:"success"}];
  let writes = 0;
  const api = {listForRepo:async()=>[],create:async()=>{writes++;return {data:{number:1}};}};
  const github = {rest:{issues:api,actions:{getWorkflowRun:async()=>({data:run}),listJobsForWorkflowRun:async()=>jobs}},paginate:async(fn,args)=>fn(args)};
  const context = {repo:{owner:"owner",repo:"repo"},payload:{workflow_run:run,repository:{full_name:"owner/repo"}}};
  const route = script("automation-failure-router.yml");
  await route(github,context,core);await route(github,context,core);
  assert.equal(writes,0);
  jobs[0].steps[1].conclusion="failure";
  await route(github,context,core);assert.equal(writes,1,"a real browser failure is not hidden by a provider hold");
  jobs[0].steps[1].conclusion="success";jobs[1].conclusion="failure";
  await route(github,context,core);assert.equal(writes,2,"failed hold persistence remains an engineering failure");
  jobs[1].conclusion="success";run.head_repository.full_name="outside/fork";
  await route(github,context,core);assert.equal(writes,3,"outside results never suppress internal triage");
  run.head_repository.full_name="owner/repo";jobs[0].conclusion="timed_out";
  await route(github,context,core);assert.equal(writes,4,"a timeout is not a verified provider-only result");
  jobs[0].conclusion="failure";
  for(const file of ["automation-post-deploy-qa.yml","production-api-smoke.yml"]) {
    const workflow=yaml.load(readFileSync(`.github/workflow-archive/2026-09-26/workflows/${file}`,"utf8"));
    const mixed=workflow.jobs.verify.steps.find(step=>step.name==="Preserve mixed provider failure for engineering triage");
    assert.ok(mixed);
    const before=writes;
    jobs[0].steps.push({name:mixed.name,conclusion:"failure"});
    run.name=workflow.name;run.path=`.github/workflows/${file}`;
    await route(github,context,core);
    assert.equal(writes,before+1,"mixed aggregation must route to engineering despite a successful quota hold");
    jobs[0].steps.pop();
  }
});
