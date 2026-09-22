// Synthetic model check using production prompts/validation. NARU_VERIFY_GATEWAY=1
// verifies configured authenticated HTTPS gateways; browser actions are separate.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import * as facilities from '../lib/facility-selection.js';
import * as actions from '../lib/assistant-actions.js';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';
import { validateAssistantPhoto } from '../lib/assistant-photo.js';
import * as guidance from '../lib/guidance-preferences.js';
import * as comfort from '../lib/trip-comfort.js';
import { sanitizePhotoTripFacts } from '../lib/photo-trip-facts.js';
import { cacheControlHeader } from '../lib/http-cache.js';
import { verifySameOriginMutation } from '../lib/security/request-boundaries.js';
import { createProviderRequester } from '../server/shared/provider-request.js';
import { ProviderRequestError } from '../lib/provider-failure.js';

const schemas = JSON.parse(execFileSync('python', ['-c', 'import sys,json;sys.path.insert(0,"server/assistant");import gateway;print(json.dumps([gateway.FORMAT,gateway.PHOTO_FORMAT]))'], {encoding:'utf8'}));
function compile(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source, {exports, require:name=>{if(!dependencies[name]) throw Error(name);return dependencies[name];}, Response,Request,URL,TextEncoder,fetch,AbortController,AbortSignal,setTimeout,clearTimeout,Date,console,...globals});
  return exports;
}
const http = compile('../server/shared/http.ts', {'../../lib/http-cache.js':{cacheControlHeader},'../../lib/security/request-boundaries.js':{verifySameOriginMutation}});
let metrics;
const {handleAssistant} = compile('../server/assistant/handler.ts', {
  '../../lib/facility-selection.js':facilities,'../shared/http':http,'../../lib/assistant-actions.js':actions,
  '../../lib/assistant-grounding.js':{groundAssistantProposal},'../../lib/assistant-photo.js':{validateAssistantPhoto},
  '../../lib/guidance-preferences.js':guidance,'../../lib/trip-comfort.js':comfort,
  '../../lib/photo-trip-facts.js':{sanitizePhotoTripFacts},'../../lib/provider-failure.js':{ProviderRequestError},
  '../shared/provider-request.js':process.env.NARU_VERIFY_GATEWAY ? {createProviderRequester} : {createProviderRequester:()=>async(_context,_url,options)=>{
    const input=JSON.parse(options.body);const photo=input.messages.some(m=>m.images);
    if (process.env.NARU_VERIFY_LM_URL) {
      const response=await fetch(`${process.env.NARU_VERIFY_LM_URL}/v1/chat/completions`,{
        method:'POST',headers:{'Content-Type':'application/json'},signal:options.signal,
        body:JSON.stringify({model:'gemma-4-26b-a4b-it',messages:input.messages.map(m=>({role:m.role,content:m.images?[{type:'text',text:m.content},{type:'image_url',image_url:{url:`data:image/jpeg;base64,${m.images[0]}`}}]:m.content})),stream:false,reasoning_effort:'none',temperature:0,max_tokens:photo?900:500,response_format:{type:'json_schema',json_schema:{name:'naru',strict:true,schema:schemas[photo?1:0]}}})});
      const result=await response.json();metrics={finish:result.choices?.[0]?.finish_reason};
      if(!response.ok || metrics.finish!=='stop') return Response.json({error:'incomplete'},{status:503});
      return Response.json(result);
    }
    const response=await fetch('http://127.0.0.1:18764/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},signal:options.signal,
      body:JSON.stringify({model:'gemma4:12b',messages:input.messages,stream:false,think:false,keep_alive:-1,format:schemas[photo?1:0],options:{num_gpu:999,num_ctx:8192,num_batch:256,num_predict:photo?900:320,temperature:0}})});
    const result=await response.json();metrics={done:result.done_reason,promptTokens:result.prompt_eval_count,outputTokens:result.eval_count,syntheticOutput:result.message?.content};
    if(!response.ok || result.done_reason==='length') return Response.json({error:'incomplete'},{status:503});
    return Response.json({choices:[{message:{content:result.message.content}}]});
  }}
},{process:{env:{WAVE_AI_BASE_URL:'http://127.0.0.1:18765/v1',WAVE_AI_MODEL:'gemma4:12b',...(process.env.NARU_VERIFY_GATEWAY ? Object.fromEntries(Object.entries(process.env).filter(([key])=>key.startsWith('WAVE_AI_'))) : {})}}});
const places=[{id:'1001',name:'이순신공원',city:'통영'},{id:'1002',name:'동피랑마을',city:'통영'}];
const context={page:'여행 설계',region:'통영',days:['2026-10-03'],places,savedIds:['1001','1002'],focusedPlaceId:'1001',profiles:['restroom']};
const cases=[
  ['여행 조건','통영에서 장애인 화장실 있는 여행지 찾아줘','settings'],
  ['일정 만들기','통영 당일 여행 일정을 만들어줘','create-itinerary'],
  ['체류 시간','이순신공원에서 90분 머물게 해줘','visit'],
  ['되돌리기','방금 변경한 거 되돌려줘','undo'],
  ['일정 점검','내 일정 점검해줘','readiness'],
  ['삭제','동피랑마을을 일정에서 빼줘','remove'],
  ['도구','직원에게 보여줄 큰 글자 질문을 준비해줘','tool'],
];
let failures=0;
for(const [name,content,expected] of cases){
 if(process.env.NARU_VERIFY_CASE && name!==process.env.NARU_VERIFY_CASE) continue;
 const start=performance.now(); const response=await handleAssistant(new Request('https://wave.example/api/assistant',{method:'POST',headers:{Origin:'https://wave.example','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}],context})}));
 const result=await response.json();const passed=response.ok&&result.proposal?.action===expected;if(!passed) failures++;
 console.log(JSON.stringify({name,passed,status:response.status,seconds:+((performance.now()-start)/1000).toFixed(2),result,metrics}));
}
if(process.argv[2]){
 const start=performance.now();const response=await handleAssistant(new Request('https://wave.example/api/assistant',{method:'POST',headers:{Origin:'https://wave.example','Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'사진에 적힌 행사명과 날짜, 시간을 읽어줘'}],photo:{mimeType:'image/jpeg',data:readFileSync(process.argv[2]).toString('base64')}})}));
 const result=await response.json();const passed=response.ok&&result.proposal===null&&result.photoFacts?.some(f=>f.date==='2026-10-03'&&f.startTime==='10:00');if(!passed) failures++;
 console.log(JSON.stringify({name:'사진에서 일정 정보',passed,status:response.status,seconds:+((performance.now()-start)/1000).toFixed(2),result,metrics}));
}
process.exitCode=failures?1:0;
