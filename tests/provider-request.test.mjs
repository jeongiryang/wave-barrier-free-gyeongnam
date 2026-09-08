import test from "node:test";
import assert from "node:assert/strict";
import {createProviderRequester} from "../server/shared/provider-request.js";
const context={provider:"kto",operation:"KorService2/areaBasedList2",family:"public-data"};
const response=(status,body,retryAfter)=>new Response(JSON.stringify(body),{status,headers:retryAfter?{"Retry-After":retryAfter}:undefined});
test("429 observes cooldown, performs no blind retry and admits one later request",async()=>{
  let time=0,calls=0;
  const run=createProviderRequester({now:()=>time,random:()=>0});
  const fetcher=async()=>{calls++;return calls===1?response(429,{},"120"):response(200,{ok:true});};
  await assert.rejects(run(context,"https://example.test",{},fetcher),e=>e.failure.kind==="rate_limited");
  time=119999;
  for(let i=0;i<5;i++)await assert.rejects(run(context,"https://example.test",{},fetcher),e=>e.failure.kind==="rate_limited");
  assert.equal(calls,1);time=120000;
  assert.deepEqual(await (await run(context,"https://example.test",{},fetcher)).json(),{ok:true});assert.equal(calls,2);
});
test("hard quota without verified reset remains closed and does not affect another operation",async()=>{
  let time=0,calls=0;
  const run=createProviderRequester({now:()=>time});
  const fetcher=async()=>{calls++;return response(200,{resultCode:"22"});};
  await assert.rejects(run(context,"https://example.test",{},fetcher),e=>e.failure.kind==="quota_exhausted");
  time=7*86400000;
  await assert.rejects(run(context,"https://example.test",{},fetcher));assert.equal(calls,1);
  await assert.rejects(run({...context,operation:"other"},"https://example.test",{},fetcher));assert.equal(calls,2);
});
test("concurrent identical requests coalesce without storing successful response data",async()=>{
  let calls=0,release;
  const ready=new Promise(resolve=>{release=resolve;});
  const run=createProviderRequester();
  const fetcher=async()=>{calls++;await ready;return response(200,{ok:true});};
  const a=run(context,"https://example.test",{},fetcher), b=run(context,"https://example.test",{},fetcher);
  await Promise.resolve();
  assert.equal(calls,1);release();await Promise.all([a,b]);
  await run(context,"https://example.test",{},fetcher);assert.equal(calls,2);
});
test("malformed JSON and network timeouts remain failures without private error echoes",async()=>{
  const run=createProviderRequester();
  const result=await run(context,"https://example.test",{},async()=>new Response("private-sentinel"));
  await assert.rejects(result.json(),e=>e.failure.kind==="malformed_response"&&!e.message.includes("private"));
  await assert.rejects(run(context,"https://example.test",{},async()=>{throw new DOMException("private-sentinel","TimeoutError");}),e=>e.failure.kind==="timeout"&&!e.message.includes("private"));
});

test("one half-open request is admitted across distinct URLs and a failed probe renews cooldown",async()=>{
  let time=0,calls=0,release;
  const run=createProviderRequester({now:()=>time,random:()=>0});
  const fetcher=async()=>{calls++;if(calls===2)await new Promise(resolve=>{release=resolve;});return response(429,{},"1");};
  await assert.rejects(run(context,"https://example.test/a",{},fetcher));
  time=1000;
  const probe=run(context,"https://example.test/a",{},fetcher);
  await Promise.resolve();
  await assert.rejects(run(context,"https://example.test/b",{},fetcher),e=>e.failure.kind==="rate_limited");
  assert.equal(calls,2);release();await assert.rejects(probe);
  time=1999;
  await assert.rejects(run(context,"https://example.test/c",{},fetcher));assert.equal(calls,2);
});

test("a synchronous transport throw leaves no dangling in-flight promise or private error",async()=>{
  let calls=0;
  const run=createProviderRequester();
  const fetcher=()=>{calls++;throw Error("private-sentinel");};
  for(let i=0;i<2;i++)await assert.rejects(run(context,"https://example.test",{},fetcher),e=>e.failure.kind==="upstream_error"&&!e.message.includes("private-sentinel"));
  assert.equal(calls,2);
});
