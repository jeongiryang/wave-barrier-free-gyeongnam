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

for (const restriction of ["rate_limited", "quota_exhausted"]) {
  test(`a late success from another URL cannot erase a newer ${restriction} circuit`, async () => {
    let time = 0, calls = 0, release;
    const run = createProviderRequester({now: () => time, random: () => 0});
    const fetcher = async url => {
      calls++;
      if (url.endsWith("/b")) await new Promise(resolve => {release = resolve;});
      return url.endsWith("/a")
        ? restriction === "rate_limited" ? response(429, {}, "120") : response(200, {resultCode:"22"})
        : response(200, {ok:true});
    };
    const a = run(context, "https://example.test/a", {}, fetcher);
    const b = run(context, "https://example.test/b", {}, fetcher);
    await assert.rejects(a, e => e.failure.kind === restriction);
    await assert.rejects(run(context, "https://example.test/c", {}, fetcher), e => e.failure.kind === restriction);
    release(); await b;
    await assert.rejects(run(context, "https://example.test/c", {}, fetcher), e => e.failure.kind === restriction);
    assert.equal(calls, 2);
    if (restriction === "rate_limited") {
      time = 120000;
      await run(context, "https://example.test/c", {}, fetcher);
      await run(context, "https://example.test/d", {}, fetcher);
      assert.equal(calls, 4, "a legitimate half-open success still restores service");
    } else {
      time = 7 * 86400000;
      await assert.rejects(run(context, "https://example.test/c", {}, fetcher));
      assert.equal(calls, 2);
    }
  });
}

test("an old request finishing cannot release another request's half-open lease", async () => {
  let time = 0, calls = 0, releaseOld, releaseProbe;
  const run = createProviderRequester({now: () => time, random: () => 0});
  const fetcher = async url => {
    calls++;
    if (url.endsWith("/old")) await new Promise(resolve => {releaseOld = resolve;});
    if (url.endsWith("/probe")) await new Promise(resolve => {releaseProbe = resolve;});
    return url.endsWith("/limit") ? response(429, {}, "1") : response(200, {ok:true});
  };
  const old = run(context, "https://example.test/old", {}, fetcher);
  await assert.rejects(run(context, "https://example.test/limit", {}, fetcher));
  time = 1000;
  const probe = run(context, "https://example.test/probe", {}, fetcher);
  await Promise.resolve(); releaseOld(); await old;
  await assert.rejects(run(context, "https://example.test/third", {}, fetcher), e => e.failure.kind === "rate_limited");
  assert.equal(calls, 3);
  releaseProbe(); await probe;
  await run(context, "https://example.test/third", {}, fetcher);
  assert.equal(calls, 4);
});

test("late throttles cannot replace a hard restriction or shorten an existing cooldown", async () => {
  for (const hard of [false, true]) {
    let time = 0, calls = 0, release;
    const run = createProviderRequester({now: () => time, random: () => 0});
    const fetcher = async url => {
      calls++;
      if (url.endsWith("/late")) {await new Promise(resolve => {release = resolve;}); return response(429, {}, "1");}
      return hard ? response(200, {resultCode:"22"}) : response(429, {}, "120");
    };
    const late = run(context, "https://example.test/late", {}, fetcher);
    await assert.rejects(run(context, "https://example.test/first", {}, fetcher));
    release(); await assert.rejects(late);
    time = hard ? 7 * 86400000 : 119999;
    await assert.rejects(run(context, "https://example.test/third", {}, fetcher), e => e.failure.kind === (hard ? "quota_exhausted" : "rate_limited"));
    assert.equal(calls, 2);
  }
});
