import test from "node:test";
import assert from "node:assert/strict";
import { classifyProviderResponse as classify, parseProviderRetryAfter, providerFailure, ProviderRequestError, caughtProviderFailure, providerFailureMessage } from "../lib/provider-failure.js";
const now=Date.parse("2026-09-08T09:00:00Z");
const publicData={provider:"kto",operation:"KorService2/areaBasedList2",family:"public-data"};
test("Retry-After accepts integer seconds and HTTP-date without inventing reset times",()=>{
  assert.equal(parseProviderRetryAfter("120",now),120000);
  assert.equal(parseProviderRetryAfter("Tue, 08 Sep 2026 09:02:00 GMT",now),120000);
  assert.equal(parseProviderRetryAfter("Tue, 08 Sep 2026 08:00:00 GMT",now),0);
  for(const bad of [null,"", "-1","1.5","NaN","99999999999999999999","tomorrow","2026-09-09"]) assert.equal(parseProviderRetryAfter(bad,now),null);
});
test("HTTP throttling is separate from auth, timeout and upstream failure",()=>{
  for(const [status,kind] of [[429,"rate_limited"],[401,"auth_error"],[403,"auth_error"],[408,"timeout"],[504,"timeout"],[500,"upstream_error"]]) {
    const result=classify({provider:"open-meteo",operation:"forecast"},{status,retryAfter:"60",now});
    assert.equal(result.kind,kind);assert.equal(result.retryAfterMs,60000);assert.equal(result.resetAt,null);
  }
});
test("public HTTP200 JSON/flat/XML quota cannot become a successful empty list",()=>{
  for(const body of [{response:{header:{resultCode:"22"}}},{resultCode:"22"}]) assert.equal(classify(publicData,{body}).kind,"quota_exhausted");
  assert.equal(classify(publicData,{raw:"<OpenAPI_ServiceResponse><returnReasonCode>22</returnReasonCode></OpenAPI_ServiceResponse>"}).kind,"quota_exhausted");
  assert.equal(classify(publicData,{body:{resultCode:"23"}}).kind,"rate_limited");
  assert.equal(classify(publicData,{body:{resultCode:"30"}}).kind,"auth_error");
  assert.equal(classify(publicData,{body:{resultCode:"10"}}).kind,"upstream_error");
  assert.equal(classify(publicData,{body:{response:{header:{resultCode:"0000"},body:{totalCount:0,items:""}}}}),null);
});
test("Kakao documented negative code distinguishes quota from credentials",()=>{
  const ctx={provider:"kakao-mobility",operation:"directions",family:"kakao"};
  assert.equal(classify(ctx,{status:400,body:{code:-10,msg:"API limit has been exceeded."}}).kind,"quota_exhausted");
  assert.equal(classify(ctx,{status:401,body:{code:-401}}).kind,"auth_error");
  assert.equal(classify(ctx,{status:403,body:{code:-4}}).kind,"access_restricted");
  assert.equal(classify(ctx,{body:{code:-12345}}),null);
});
test("ODsay gateway error arrays preserve explicit auth/limit and unknown lock reasons",()=>{
  const ctx={provider:"odsay",operation:"searchPubTransPathT",family:"odsay"};
  assert.equal(classify(ctx,{body:{error:[{code:"500",message:"[ApiKeyAuthFailed] ApiKey authentication failed."}]}}).kind,"auth_error");
  assert.equal(classify(ctx,{body:{error:[{code:"500",message:"Daily call limit exceeded"}]}}).kind,"quota_exhausted");
  assert.equal(classify(ctx,{body:{error:{code:"LOCKED"}}}).kind,"access_restricted");
  assert.equal(classify(ctx,{body:{error:[{code:"500",message:"Unknown problem"}]}}).kind,"upstream_error");
  assert.equal(classify(ctx,{body:{error:[{code:"3",message:"No results"}]}}),null);
  assert.equal(classify(ctx,{body:{error:[{code:"500",message:"Daily call limit has not been exceeded"}]}}).kind,"upstream_error");
  assert.equal(classify(ctx,{body:{error:[]}}).kind,"malformed_response");
});
test("public failures never contain provider raw messages, URL or private values",()=>{
  const result=classify(publicData,{body:{resultCode:"unknown-secret-sentinel",resultMsg:"https://example.test?serviceKey=private-sentinel"}});
  assert.equal(result.code,null);assert.doesNotMatch(JSON.stringify(result),/secret|private|serviceKey|example\.test/);
  const err=new ProviderRequestError(result);assert.doesNotMatch(err.message,/private|secret/);
  assert.deepEqual(caughtProviderFailure(err,publicData),result);
  assert.equal(caughtProviderFailure(new DOMException("private-sentinel","TimeoutError"),publicData).kind,"timeout");
  assert.equal(caughtProviderFailure(new SyntaxError("private-sentinel"),publicData).kind,"malformed_response");
  assert.equal(providerFailure(publicData,"quota_exhausted").retryable,false);
  assert.equal(providerFailure(publicData,"upstream_error",{code:"private-sentinel"}).code,null);
  assert.match(providerFailureMessage(result,true),/provider/);
});
