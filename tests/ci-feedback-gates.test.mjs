import assert from "node:assert/strict";
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import yaml from "js-yaml";
import impact from "../.github/automation/ci-impact.cjs";
import {ciGateEvidence,main} from "../scripts/subscription-queue-cli.mjs";
import {REPOSITORY,readWorkOrder,enqueue,claim,implementationResult} from "../scripts/subscription-queue.mjs";
const workflow=yaml.load(readFileSync(".github/workflows/ci.yml","utf8"));
const A="a".repeat(40),B="b".repeat(40);
const run={id:4,run_attempt:2,path:".github/workflows/ci.yml",head_sha:B,head_repository:{full_name:REPOSITORY},event:"pull_request",status:"completed",conclusion:"success"};
const names=["quality","sandbox-boundary","browser (1)","browser (2)","validate"];
const jobs=(mode="full")=>(mode==="full"?names:["quality","sandbox-boundary","fast-browser (1)","fast-browser (2)","fast-pr-gate"]).map(name=>({name,run_id:4,head_sha:B,status:"completed",conclusion:"success",run_attempt:1}));
const request=(file="docs/ai-logs/current.md")=>({event:"pull_request",actor:"jeongiryang",owner:"jeongiryang",repository:REPOSITORY,pr:{draft:true,user:{login:"jeongiryang"},base:{ref:"main"},head:{repo:{full_name:REPOSITORY}},labels:[],changed_files:1},files:[{filename:file,status:"modified"}]});

test("Fast is limited to a complete reviewed impact map on an Owner internal Draft",()=>{
  const docs=impact.selectImpact(request());
  assert.equal(docs.mode,"fast");
  assert.deepEqual(docs.specs,["e2e/accessibility-final.spec.ts","e2e/core-journeys.spec.ts","e2e/site-chrome-contrast.spec.ts"]);
  const weather=impact.selectImpact(request("features/planner/components/WeatherBoard.tsx"));
  for(const file of ["e2e/weather-language.spec.ts","e2e/provider-quota-notices.spec.ts","e2e/departure-readiness.spec.ts",...docs.specs])assert.ok(weather.specs.includes(file));
  assert.ok(impact.selectImpact(request("e2e/landing-theme-contrast.spec.ts")).specs.includes("e2e/landing-theme-contrast.spec.ts"));
  const changed=request();changed.files.push(changed.files[0]);changed.pr.changed_files=2;
  assert.equal(new Set(impact.selectImpact(changed).specs).size,docs.specs.length);
});

test("Ready, main, foreign actors/forks and any uncertain/shared change require Full",()=>{
  for(const file of ["app/page.tsx","app/styles/theme.css",".github/workflows/ci.yml","package-lock.json","playwright.config.ts","e2e/fixtures.ts","features/planner/types.ts","AGENTS.md","CLAUDE.md","scripts/subscription-queue-cli.mjs","docs/../../x.md","docs/ok.md\n--grep=none"]){
    assert.equal(impact.selectImpact(request(file)).mode,"full",file);
  }
  for(const mutate of [r=>r.event="push",r=>r.actor="outside",r=>r.pr.user.login="outside",r=>r.pr.head.repo.full_name="outside/fork",r=>r.pr.draft=false,r=>r.pr.labels=[{name:"status:ready-for-qa"}],r=>r.pr.changed_files=2,r=>r.files=[],r=>r.files[0].status="added",r=>r.files[0].status="removed",r=>r.files[0].previous_filename="app/page.tsx",r=>r.pr.base.ref="unreviewed"]){
    const r=request();mutate(r);assert.equal(impact.selectImpact(r).mode,"full");
  }
});

test("workflow planning defaults to Full for a moved head/base and passes only reviewed file data",async()=>{
  for(const stale of ["head","base",null]){
    const input=request();input.pr.number=2;input.pr.head.sha=B;input.pr.base.sha=A;
    const outputs={},context={eventName:"pull_request",actor:input.actor,repo:{owner:input.owner,repo:"wave-barrier-free-gyeongnam"},payload:{pull_request:{number:2,head:{sha:stale==="head"?A:B},base:{sha:stale==="base"?B:A}}}};
    let lists=0;
    await impact.plan({context,core:{setOutput:(k,v)=>outputs[k]=v,info(){}},github:{rest:{pulls:{get:async()=>({data:input.pr}),listFiles:()=>{}}},paginate:async()=>{lists++;return input.files;}}});
    assert.equal(outputs.mode,stale?"full":"fast");assert.equal(lists,stale?0:1);
    assert.equal(Array.isArray(JSON.parse(outputs.specs)),true);
  }
});

test("Fast runner passes only validated spec paths as argv and keeps both unchanged projects/shards",()=>{
  const step=workflow.jobs["fast-browser"].steps.find(s=>s.name==="변경 영향 브라우저·접근성 검사");
  const script=step.run.split("node --input-type=module - <<'JS'\n")[1].split("\nJS")[0];
  const folder=mkdtempSync(join(tmpdir(),"wave-fast-argv-"));
  const cli=join(folder,"node_modules/@playwright/test");mkdirSync(cli,{recursive:true});
  writeFileSync(join(cli,"cli.js"),"console.log(JSON.stringify(process.argv.slice(2)))");
  for(const shard of ["1","2"]){
    const child=spawnSync(process.execPath,["--input-type=module","-e",script],{cwd:folder,env:{CI_SELECTED_SPECS:JSON.stringify(["e2e/core-journeys.spec.ts"]),FAST_SHARD:shard},encoding:"utf8",windowsHide:true});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),["test","e2e/core-journeys.spec.ts",`--shard=${shard}/2`]);
  }
  for(const specs of [[],["--grep=none"],["../auth.json"],["e2e/good.spec.ts;curl"],["e2e/good.spec.ts\n--grep"],["e2e/good.spec.ts","e2e/good.spec.ts"],"e2e/good.spec.ts",[3]]){
    const child=spawnSync(process.execPath,["--input-type=module","-e",script],{cwd:folder,env:{CI_SELECTED_SPECS:JSON.stringify(specs),FAST_SHARD:"1"},encoding:"utf8",windowsHide:true});
    assert.notEqual(child.status,0);assert.equal(child.stdout,"");
  }
  assert.doesNotMatch(step.run,/--workers|--retries|--timeout|--grep|--pass-with-no-tests|--config|shell:\s*true/);
});

test("exact latest Full proof accepts retained prior-attempt jobs but rejects every incomplete gate",()=>{
  assert.equal(ciGateEvidence(run,jobs(),B),"full");
  assert.equal(ciGateEvidence(run,jobs("fast"),B),"fast");
  assert.equal(ciGateEvidence(run,[...jobs("fast"),{name:"validate",conclusion:"skipped"}],B),null);
  for(const name of names){
    for(const conclusion of ["failure","skipped","cancelled","timed_out",null])assert.equal(ciGateEvidence(run,jobs().map(j=>j.name===name?{...j,conclusion}:j),B),null,`${name}/${conclusion}`);
    assert.equal(ciGateEvidence(run,jobs().filter(j=>j.name!==name),B),null,name);
    for(const changed of [{head_sha:A},{run_id:99},{status:"in_progress"}])assert.equal(ciGateEvidence(run,jobs().map(j=>j.name===name?{...j,...changed}:j),B),null);
  }
  for(const changed of [{head_sha:A},{head_repository:{full_name:"outside/fork"}},{path:".github/workflows/other.yml"},{conclusion:"failure"},{status:"in_progress"},{run_attempt:0},{id:0},{event:"workflow_dispatch"}])assert.equal(ciGateEvidence({...run,...changed},jobs(),B),null);
  assert.equal(ciGateEvidence(run,[...jobs(),jobs()[0]],B),null);
  assert.equal(ciGateEvidence(run,undefined,B),null);
});

test("always-running final gate cannot create protected validate for Fast or accept an incomplete selection",()=>{
  const gate=workflow.jobs.validate;
  assert.equal(gate.name,"${{ needs.impact.outputs.mode == 'fast' && 'fast-pr-gate' || 'validate' }}");
  assert.equal(gate.if,"${{ always() }}");
  const extra=gate.steps[1];
  const script=/^node -e '(.+)'$/.exec(extra.run)[1];
  for(const mode of ["fast","full","", "unknown"]) for(const result of ["success","failure","skipped","cancelled",""]) for(const other of ["skipped","success","failure",""]){
    const child=spawnSync(process.execPath,["-e",script],{env:{CI_MODE:mode,IMPACT_RESULT:result,UNSELECTED_BROWSER_RESULT:other},windowsHide:true});
    assert.equal(child.status,["fast","full"].includes(mode)&&result==="success"&&other==="skipped"?0:1);
  }
  assert.equal(workflow.jobs.browser.if,"${{ needs.impact.outputs.mode == 'full' }}");
  assert.equal(workflow.jobs["fast-browser"].if,"${{ needs.impact.outputs.mode == 'fast' }}");
  assert.deepEqual(workflow.jobs["fast-browser"].strategy,workflow.jobs.browser.strategy);
  assert.equal(workflow.jobs.impact.steps[0].with.ref,"${{ github.event.pull_request.base.sha || github.sha }}");
  assert.deepEqual(workflow.jobs.impact.permissions,{contents:"read","pull-requests":"read"});
  assert.ok(workflow.on.pull_request.types.includes("ready_for_review"));
  assert.ok(workflow.on.pull_request.types.includes("labeled"));
  assert.deepEqual(workflow.on.push.branches,["main"]);
  assert.match(workflow.jobs.impact.steps[1].with.script,/core.setOutput\('mode', 'full'\)/);
});

test("CD checks the same Full proof outside the Production environment before reading deployment secrets",()=>{
  const cd=yaml.load(readFileSync(".github/workflows/cd.yml","utf8"));
  assert.equal(cd.jobs.deploy.needs,"full-gate");
  assert.equal(cd.jobs["full-gate"].environment,undefined);
  assert.deepEqual(cd.jobs["full-gate"].permissions,{contents:"read",actions:"read"});
  const source=JSON.stringify(cd.jobs["full-gate"]);
  assert.doesNotMatch(source,/secrets\.|npm ci|VERCEL_TOKEN/);
  assert.match(source,/ciGateEvidence/);
  assert.match(source,/filter:'latest'/);
  assert.match(source,/!== 'full'/);
  assert.match(cd.jobs["full-gate"].if,/head_repository.full_name == github.repository/);
  assert.match(cd.jobs["full-gate"].if,/workflow_run.event == 'push'/);
  assert.equal(cd.jobs.deploy.environment,"production");
});

function queueFixture(mode="fast"){
  const timestamp="2026-09-08T00:00:00Z";
  const order={version:2,issue:1,priority:"P1",baseSha:A,branch:"chore/internal-fixture",pullRequest:2,scope:["docs/internal.md"],acceptance:["Correct a documented state."],validation:"documentation"};
  const comment={id:3,user:{login:"jeongiryang"},created_at:timestamp,updated_at:timestamp,body:"<!-- wave-work-order:v2 -->\n```json\n"+JSON.stringify(order)+"\n```"};
  let task=implementationResult(claim(enqueue(null,readWorkOrder(1,comment),0),"implementation","fixture",1,"fixture-lease"),"fixture-lease",2,{headSha:B,pullRequest:2});
  const pr={state:"open",draft:true,labels:[],head:{sha:B,ref:order.branch,repo:{full_name:REPOSITORY}}};
  const writes=[];
  const api=async(endpoint,options)=>{
    if(endpoint.endsWith("/issues/1"))return{state:"open",labels:[]};
    if(endpoint.includes("/issues/1/comments?"))return[comment];
    if(endpoint.endsWith("/pulls/2"))return pr;
    if(endpoint.includes("/workflows/ci.yml/runs?"))return{workflow_runs:[run]};
    if(endpoint.includes("/jobs?filter=latest"))return{jobs:mode==="missing"?[]:jobs(mode)};
    if(endpoint.endsWith("/issues/2/labels")&&options?.method==="POST"){writes.push(options.body);pr.labels=options.body.labels.map(name=>({name}));return pr.labels;}
    throw Error("Unexpected fixture endpoint");
  };
  return{api,writes,pr,comment,task:()=>task,queue:{update:async(_key,change)=>{task=await change(task);return task;}}};
}

test("Fast success requests Full once, preserves attempts and never grants QA; real Full can grant QA",async()=>{
  const originalCi=process.env.CI, originalActions=process.env.GITHUB_ACTIONS;
  delete process.env.CI; delete process.env.GITHUB_ACTIONS;
  try {
  const f=queueFixture();const original=structuredClone(f.task());
  for(let i=0;i<2;i++){const task=await main(["refresh","1"],{api:f.api,queue:f.queue,now:3+i});assert.equal(task.state,"ci-pending");assert.deepEqual(task.attempts,original.attempts);assert.deepEqual(task.receipts,original.receipts);}
  assert.deepEqual(f.writes,[{labels:["status:ready-for-qa"]}]);
  const full=queueFixture("full");assert.equal((await main(["refresh","1"],{...full,now:3})).state,"qa-ready");assert.equal(full.writes.length,0);
  const missing=queueFixture("missing");assert.equal((await main(["refresh","1"],{...missing,now:3})).state,"ci-pending");assert.equal(missing.writes.length,0);
  const revoked=queueFixture();revoked.comment.updated_at="2026-09-08T00:00:01Z";
  await assert.rejects(main(["refresh","1"],{...revoked,now:3}),/UNTRUSTED_WORK_ORDER/);assert.equal(revoked.writes.length,0);
  } finally {
    if(originalCi!==undefined)process.env.CI=originalCi;
    if(originalActions!==undefined)process.env.GITHUB_ACTIONS=originalActions;
  }
});
