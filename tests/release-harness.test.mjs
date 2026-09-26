import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';
import { validateContract, evidenceErrors } from '../scripts/harness.mjs';
import { assertRun, quickJobs, releaseJobs } from '../scripts/verify-deployment-ci.mjs';
import { validateIntent, validateJourney } from '../scripts/check-naru-live.mjs';
import { validDeploymentHealth } from '../scripts/check-deployment-health.mjs';

const source = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ci = yaml.load(source('.github/workflows/ci.yml'));
const full = yaml.load(source('.github/workflows/release-audit.yml'));

test('active merge and full release gates reject every incomplete job result',()=>{
  for(const gate of [ci.jobs.validate,full.jobs['release-validate']]) {
    assert.deepEqual(gate.needs,['quality','browser']);
    assert.equal(gate.if,'${{ always() }}');
    const script=/^node -e '(.+)'$/.exec(gate.steps[0].run)?.[1];
    assert.ok(script);
    for(const quality of ['success','failure','cancelled','skipped','']) for(const browser of ['success','failure','cancelled','skipped','']) {
      const result=spawnSync(process.execPath,['-e',script],{env:{QUALITY_RESULT:quality,BROWSER_RESULT:browser}});
      assert.equal(result.status,quality==='success'&&browser==='success'?0:1);
    }
  }
});

test('quick CI and full audit have distinct complete device coverage and no model automation',()=>{
  assert.deepEqual(ci.jobs.browser.strategy.matrix,{shard:[1,2],device:['desktop','mobile']});
  assert.deepEqual(full.jobs.browser.strategy.matrix,{shard:[1,2,3,4,5,6,7,8],device:['desktop','mobile']});
  assert.deepEqual(full.on,{workflow_dispatch:{}});
  const active=readdirSync(new URL('../.github/workflows/',import.meta.url)).sort();
  assert.deepEqual(active,['cd.yml','ci.yml','production-api-smoke.yml','release-audit.yml']);
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  for(const file of active) {
    const text=source(`.github/workflows/${file}`), workflow=yaml.load(text);
    assert.ok(workflow.name && workflow.on && workflow.jobs);
    assert.doesNotMatch(text,/OPENAI_API_KEY|CODEX_AUTH|subscription-(?:run|worker|queue)|codex-action|skip-ci/i);
    for(const job of Object.values(workflow.jobs)) for(const step of job.steps||[]) {
      assert.notEqual(step['continue-on-error'],true);
      if(step.uses?.startsWith('actions/github-script@')) assert.doesNotThrow(()=>new AsyncFunction('github','context','core','require',step.with.script));
    }
  }
  assert.match(source('.github/workflows/cd.yml'),/verify-deployment-ci.mjs/);
  assert.equal(ci.jobs.certify,undefined);
});

test('deployment cannot use old, partial, foreign, skipped, or wrong-profile CI proof',()=>{
  const sha='a'.repeat(40),repository='jeongiryang/wave-barrier-free-gyeongnam';
  const run={head_sha:sha,repository:{full_name:repository},path:'.github/workflows/ci.yml',status:'completed',conclusion:'success',event:'push',head_branch:'main'};
  const jobs=quickJobs.map(name=>({name,status:'completed',conclusion:'success'}));
  const options={sha,repository};
  assert.doesNotThrow(()=>assertRun(run,jobs,options));
  for(const patch of [{head_sha:'b'.repeat(40)},{event:'pull_request'},{head_branch:'other'},{conclusion:'failure'},{status:'in_progress'},{repository:{full_name:'other/repo'}},{path:'.github/workflows/old-ci.yml'}]) assert.throws(()=>assertRun({...run,...patch},jobs,options));
  for(const bad of [jobs.slice(1),[...jobs,jobs[0]],jobs.map((j,i)=>i===2?{...j,conclusion:'skipped'}:j),releaseJobs.map(name=>({name,status:'completed',conclusion:'success'}))]) assert.throws(()=>assertRun(run,bad,options));
});

test('missing pages, missing tests and duplicate requirements block contract validation',()=>{
  const contract=JSON.parse(source('harness/features.json'));
  assert.equal(validateContract(contract),true);
  assert.throws(()=>validateContract({...contract,features:[...contract.features,contract.features[0]]}));
  assert.throws(()=>validateContract({...contract,features:contract.features.map(f=>({...f,pages:[1]}))}));
  assert.throws(()=>validateContract(contract,()=>false));
  assert.ok(evidenceErrors(contract,{schemaVersion:1,commit:'a'.repeat(40)},'a'.repeat(40)).length>0);
});

test('release evidence cannot turn pending, duplicated, expired or wrong-commit reviews green',()=>{
  const feature={id:'naru',evidenceKinds:['browser','local-llm']};
  const contract={features:[feature]},sha='a'.repeat(40),now=Date.now();
  const evidence={schemaVersion:1,commit:sha,fullAuditRunId:123,blockers:[],rendering:[1440,960,390].map(width=>({width,status:'pass',evidence:'capture.png'})),naru:{source:'local-llm',status:'pass',report:'naru.json'},features:[{id:'naru',checks:feature.evidenceKinds.map(kind=>({kind,status:'pass',evidence:'report.json',reviewer:'independent reviewer',checkedAt:new Date(now).toISOString()}))}]};
  assert.deepEqual(evidenceErrors(contract,evidence,sha,now),[]);
  assert.ok(evidenceErrors(contract,{...evidence,commit:'b'.repeat(40)},sha,now).length);
  assert.ok(evidenceErrors(contract,{...evidence,features:[...evidence.features,...evidence.features]},sha,now).length);
  for(const change of [{status:'pending'},{reviewer:''},{checkedAt:'invalid'},{checkedAt:new Date(now-8*86400000).toISOString()},{checkedAt:new Date(now+86400000).toISOString()}]) {
    const bad=structuredClone(evidence);Object.assign(bad.features[0].checks[0],change);
    assert.ok(evidenceErrors(contract,bad,sha,now).length);
  }
});

test('Naru live checker rejects HTTP failure, error events and absent proposals',()=>{
  const event={type:'result',draft:{stops:[{place:{id:'123',name:'Official place'},date:'2026-09-29'}]}};
  assert.equal(validateJourney(200,[event],'2026-09-29','2026-09-29'),true);
  for(const [status,events] of [[503,[event]],[200,[]],[200,[event,{type:'error'}]],[200,[event,event]],[200,[{type:'result',draft:{stops:[]}}]]]) assert.equal(validateJourney(status,events,'2026-09-29','2026-09-29'),false);
  assert.equal(validateJourney(200,[event],'2026-09-30','2026-09-30'),false);
  assert.equal(validateIntent({source:'fallback',proposal:{action:'create-itinerary'}},{action:'create-itinerary'}),false);
  assert.equal(validateIntent({source:'local-llm',proposal:{action:'create-itinerary'}},{action:'create-itinerary'}),true);
});

test('deployment health binds successful configuration to a valid exact revision without leaking arbitrary environment text',()=>{
  const sha='a'.repeat(40),body={ok:true,scope:'configuration',commit:sha,checkedAt:new Date().toISOString()};
  assert.equal(validDeploymentHealth(body,sha),true);
  for(const value of [null,undefined,'secret-value','b'.repeat(40)]) assert.equal(validDeploymentHealth({...body,commit:value},sha),false);
  assert.equal(validDeploymentHealth({...body,ok:false},sha),false);
  assert.equal(validDeploymentHealth(body,'not-a-sha'),false);
  const health=source('server/transport/health.ts');
  assert.match(health,/\^\[a-f0-9\]\{40\}\$/);
  assert.match(health,/env.WAVE_DEPLOYMENT_SHA : null/);
  assert.match(source('server/shared/env.ts'),/WAVE_DEPLOYMENT_SHA: values.WAVE_DEPLOYMENT_SHA/);
});
