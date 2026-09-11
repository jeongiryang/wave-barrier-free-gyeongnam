import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as validation from '../lib/community/validation.js';
import * as boundaries from '../lib/security/request-boundaries.js';
import { rateLimitResponse } from '../lib/rate-limit-response.js';

function load(path, modules) {
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(compiled,{exports,require:name=>{if(name in modules)return modules[name];throw new Error('Unexpected module '+name);},Response,Request,TextEncoder,Date});
  return exports;
}
const requestParser=load('lib/server-request.ts',{'./security/request-boundaries.js':boundaries});
function actions({authenticated=true,owner=true}={}){
  const writes=[];
  const run=load('features/community/server/post-actions.ts',{
    '../../../lib/community/validation.js':validation,
    '../../../lib/rate-limit-response.js':{rateLimitResponse},
    '../../../lib/server-request':requestParser,
    './posts-repository':{createCommunityPost:async(userId,name,value)=>{writes.push({userId,name,value});return{id:'created'};},updateCommunityPost:async(postId,userId,value)=>{writes.push({postId,userId,value});return true;}},
    './http':{authenticatedCommunityUser:async()=>authenticated?{user:{id:'session-owner'}}:{error:Response.json({error:'login'}, {status:401})},communityResponse:(value,status=200)=>Response.json(value,{status}),verifyCommunityOwnership:async()=>owner?null:Response.json({error:'owner'}, {status:403})},
    './session':{communityAuthorName:()=> '작성자'},
  });return {run,writes};
}
const photo=JSON.parse(readFileSync(new URL('./visit-photo-fixture.json',import.meta.url),'utf8'));
const values={category:'review',title:'입구 동선을 직접 확인했어요',content:'시설 입구와 휠체어 이동 동선을 직접 확인했습니다.',region:'창원',placeId:'1001',placeName:'미술관',visitDate:'2026-08-30',visitPhotos:[{dataUrl:photo,caption:'계단 없는 이동 동선'}],photoConsent:true,authorId:'forged-author'};
const request=(body=values,origin='https://wave.test')=>new Request('https://wave.test/api/community/posts',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});

test('photo post mutation keeps authentication/origin/body limits and session-derived author',async()=>{
  for(const setup of [{authenticated:false},{owner:false}]){
    const h=actions(setup),response=setup.authenticated===false?await h.run.createPost(request()):await h.run.updatePost(request(),'other-post');
    assert.equal(response.status,setup.authenticated===false?401:403);assert.equal(h.writes.length,0);
  }
  const h=actions();assert.equal((await h.run.createPost(request(values,'https://other.test'))).status,403);
  assert.equal((await h.run.createPost(request({...values,content:'가'.repeat(130000)}))).status,413);
  assert.equal((await h.run.createPost(request({...values,photoConsent:false}))).status,400);assert.equal(h.writes.length,0);
  assert.equal((await h.run.createPost(request())).status,201);assert.equal(h.writes.length,1);assert.equal(h.writes[0].userId,'session-owner');
  assert.equal(h.writes[0].value.authorId,undefined);assert.equal(h.writes[0].value.visitPhotos[0].width,64);
  assert.equal(h.writes[0].value.photoConsent,undefined);
});
