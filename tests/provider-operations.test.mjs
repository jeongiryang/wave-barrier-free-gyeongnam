import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "js-yaml";
import policy from "../.github/automation/provider-hold.cjs";
import { ProviderBlocked, createSmokeBudget, LIVE_SMOKE_REQUEST_BUDGET } from "../scripts/provider-smoke-policy.mjs";
import { approvedOrder, main as queueMain } from "../scripts/subscription-queue-cli.mjs";

const sha = "a".repeat(40);
const restriction = {provider:"odsay",operation:"searchPubTransPathT",kind:"quota_exhausted",retryAfterMs:null};
function harness() {
  const issues = [], writes = [], outputs = [];
  const api = {
    listForRepo: async () => issues.filter(issue => issue.state !== "closed"),
    create: async value => {
      writes.push(value);
      const issue = {...value,number:issues.length + 1,state:"open",user:{login:"github-actions[bot]"}};
      issues.push(issue); return {data:issue};
    },
  };
  return {issues,writes,outputs,github:{rest:{issues:api},paginate:async (fn,args) => fn(args)},context:{repo:{owner:"owner",repo:"repo"}},core:{info(){},setOutput:(...args) => outputs.push(args),setFailed:message => outputs.push(["failed",message])}};
}

test("only explicit safe external restrictions can become operational holds; mixed failures remain engineering failures", () => {
  const body = {providers:[{state:"error",failure:{...restriction,message:"PRIVATE_SENTINEL",url:"https://private.invalid/?key=PRIVATE_SENTINEL"}}]};
  assert.deepEqual(policy.providerRestrictions(body), [{...restriction,resetAt:null}]);
  assert.doesNotMatch(JSON.stringify(policy.providerRestrictions(body)), /PRIVATE_SENTINEL/);
  for (const bad of [{state:"error"},{state:"error",failure:{...restriction,kind:"malformed_response"}},{state:"error",failure:{...restriction,operation:"untrusted-shell"}}]) {
    assert.deepEqual(policy.providerRestrictions({...body,providers:[...body.providers,bad]}), []);
  }
  assert.deepEqual(policy.providerRestrictions({places:[],statuses:[{state:"empty"}]}), []);
});

test("duplicate restrictions create one durable Issue and preflight blocks without another live call", async () => {
  const h = harness();
  const event = {serialized:JSON.stringify([restriction,restriction]),sha,runId:12};
  await policy.recordHolds(h,event);
  await policy.recordHolds(h,{...event,runId:13});
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.writes[0].labels, ["status:blocked-external","agent:pm"]);
  assert.doesNotMatch(h.writes[0].title, /code-fix|workflow failure/);
  await policy.preflight(h);
  assert.equal(h.outputs[0][0], "provider_block");
  assert.match(h.outputs[1][1], /no live API calls made/);
  h.issues[0].state = "closed";
  h.outputs.length = 0;
  await policy.preflight(h);
  assert.equal(h.outputs.length, 0, "verified manual recovery permits the original smoke to run, not automatic PASS");
});

test("untrusted or malformed Issue content cannot grant a hold or executor authority", async () => {
  const h = harness();
  await policy.recordHolds(h,{serialized:JSON.stringify([restriction]),sha,runId:12});
  const good = h.issues[0];
  for (const bad of [{...good,user:{login:"outside"}},{...good,pull_request:{}},{...good,body:good.body.replace(sha,"not-a-sha")},{...good,body:good.body.replace('"version":1','"version":2')}]) assert.equal(policy.parseHold(bad),null);
  await assert.rejects(policy.recordHolds(h,{serialized:'[{"provider":"unknown"}]',sha,runId:12}), /Unverified/);
  assert.equal(h.writes.length,1);
  let reads = 0;
  await assert.rejects(approvedOrder(12,async () => {reads++;return good;}), /BLOCKED_EXTERNAL/);
  assert.equal(reads,1, "no PR lookup, model or publish after an operational hold");
});

test("an already queued task cannot claim a newly external-blocked Issue or mutate attempts", async () => {
  const oldCi = process.env.CI, oldActions = process.env.GITHUB_ACTIONS;
  delete process.env.CI; delete process.env.GITHUB_ACTIONS;
  let writes = 0, reads = 0;
  const task = {attempts:{implementation:2,qa:2},generation:5};
  const original = structuredClone(task);
  try {
    await assert.rejects(queueMain(["claim","12","implementation","executor"],{
      api:async () => {reads++;return {labels:[{name:"status:blocked-external"}]};},
      queue:{update:async (_key,change) => {const result = await change(task); writes++; return result;}},
    }), /BLOCKED_EXTERNAL/);
    assert.equal(writes,0); assert.equal(reads,1); assert.deepEqual(task,original);
  } finally {
    if (oldCi !== undefined) process.env.CI = oldCi;
    if (oldActions !== undefined) process.env.GITHUB_ACTIONS = oldActions;
  }
});

test("live application request budget fails closed before an extra call and cannot be raised", () => {
  const budget = createSmokeBudget();
  for(let i=0;i<LIVE_SMOKE_REQUEST_BUDGET;i++) budget.take();
  assert.throws(() => budget.take(), /BUDGET_EXHAUSTED/);
  assert.equal(budget.count(),33);
  for(const value of [0,-1,NaN,Infinity,34,1.5]) assert.throws(() => createSmokeBudget(value), /Invalid/);
  assert.throws(() => new ProviderBlocked([{...restriction,provider:"outside"}]), /Unverified/);
  assert.doesNotMatch(JSON.stringify(new ProviderBlocked([{...restriction,message:"PRIVATE_SENTINEL"}]).failures), /PRIVATE_SENTINEL/);
});

for (const [status, body] of [[200,{failure:restriction}],[429,{failure:restriction}],[502,{failure:restriction}],[429,{error:"PRIVATE_SENTINEL"}]]) {
  test(`real smoke stops at HTTP${status} ${body.failure ? "provider restriction" : "application throttle"}, writes only safe metadata and never claims PASS`, () => {
    const folder = mkdtempSync(join(tmpdir(),"wave-provider-smoke-"));
    const entry = new URL("../scripts/check-production-apis.mjs",import.meta.url).href;
    const output = join(folder,"outputs.txt");
    const script = `let calls=0; globalThis.fetch=async url=>{calls++; if(calls>2)throw Error('EXTRA_CALL'); return new Response(JSON.stringify(String(url).includes('/api/health')?{ok:true,scope:'configuration',keys:[]}:${JSON.stringify({...body,message:"PRIVATE_SENTINEL"})}),{status:String(url).includes('/api/health')?200:${status},headers:{'Retry-After':'90'}});}; await import(${JSON.stringify(entry)}); console.log('APPLICATION_CALLS='+calls);`;
    const child = spawnSync(process.execPath,["--input-type=module","-e",script],{cwd:folder,encoding:"utf8",windowsHide:true,timeout:10000,env:{GITHUB_OUTPUT:output}});
    assert.equal(child.status,1,child.stderr);
    assert.match(child.stdout,/APPLICATION_CALLS=2/);
    assert.doesNotMatch(child.stdout+child.stderr+readFileSync(output,"utf8"),/PRIVATE_SENTINEL|"ok":true/);
    const evidence = JSON.parse(readFileSync(join(folder,"provider-smoke-result.json"),"utf8"));
    assert.equal(evidence.result,"blocked-external");assert.equal(evidence.ok,false);assert.equal(evidence.applicationRequests,2);
    if (!body.failure) {assert.equal(evidence.failures[0].provider,"wave");assert.equal(evidence.failures[0].retryAfterMs,90000);}
  });
}

test("API smoke and post-deploy QA serialize live calls, separate write permission and keep API model path disabled", () => {
  const workflows = ["production-api-smoke","automation-post-deploy-qa"].map(name => yaml.load(readFileSync(`.github/workflows/${name}.yml`,"utf8")));
  for (const workflow of workflows) {
    assert.equal(workflow.concurrency.group,"production-provider-smoke");
    assert.equal(workflow.jobs.verify.permissions.issues,"read");
    assert.equal(workflow.jobs["provider-hold"].permissions.issues,"write");
    assert.equal(workflow.jobs.verify.steps.find(step=>step.id==="api").run,"npm run check:production");
    assert.doesNotMatch(JSON.stringify(workflow.jobs.verify), /secrets\./);
    assert.doesNotMatch(JSON.stringify(workflow.jobs["provider-hold"]), /npm |secrets\.|continue-on-error/);
    assert.match(workflow.jobs["provider-hold"].if,/needs.verify.result == 'failure'/);
  }
  const qa = workflows[1];
  assert.match(qa.jobs["notify-pm"].if,/false &&/);
  assert.match(qa.jobs.verify.steps.find(step=>step.name==="읽기 전용 Production 사용자 여정·접근성 smoke").if,/!cancelled\(\)/);
  assert.ok(qa.jobs.verify.steps.find(step=>step.name==="Recheck deployment after smoke"));
});
