import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validateIntent(body, expected) {
  return body?.source === 'local-llm' && body?.proposal?.action === expected.action
    && Object.entries(expected).every(([key,value]) => JSON.stringify(body.proposal[key]) === JSON.stringify(value));
}
export function validateJourney(status, events, start, end) {
  const results = events.filter(event => event.type === 'result');
  const draft = results[0]?.draft;
  return status === 200 && !events.some(event => event.type === 'error') && results.length === 1
    && Array.isArray(draft?.stops) && draft.stops.length > 0
    && draft.stops.every(stop => typeof stop.place?.id === 'string' && stop.place.id.length > 0 && typeof stop.place?.name === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(stop.date || '') && stop.date >= start && stop.date <= end);
}

async function main() {
  const base = new URL(process.env.WAVE_NARU_BASE_URL || 'http://127.0.0.1:4173');
  if (!((['127.0.0.1','localhost'].includes(base.hostname) && base.protocol === 'http:') || (base.origin === 'https://wave-barrier-free-gyeongnam.vercel.app')) || base.username || base.password) throw new Error('Use local development or the authorized WAVE Production origin');
  const date = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+2*86400000));
  const context = {region:'통영',profiles:'',themes:'nature',start:date,end:date,days:[date],transport:'car',savedIds:[],places:[],stops:[]};
  const report = {schemaVersion:1,source:'local-llm',base:base.origin,commit:null,checkedAt:new Date().toISOString(),status:'fail',checks:[]};
  const post = async(path,body) => fetch(new URL(path,base),{method:'POST',headers:{'Content-Type':'application/json',Origin:base.origin},body:JSON.stringify(body),signal:AbortSignal.timeout(50000)});
  try {
    const health = await fetch(new URL('/api/health',base),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    const deployment = await health.json();
    report.commit = /^[a-f0-9]{40}$/.test(deployment.commit || '') ? deployment.commit : null;
    if (process.env.WAVE_EXPECTED_SHA && report.commit !== process.env.WAVE_EXPECTED_SHA) throw new Error('Production commit differs from the requested verification target');
    const started=Date.now();
    const response=await post('/api/assistant',{messages:[{role:'user',content:`부모님과 ${date} 통영 당일 여행을 자동차로 준비해줘`}],context});
    const intent=await response.json();
    const intentPass=response.ok && validateIntent(intent,{action:'create-itinerary',region:'통영',start:date,end:date,transport:'car'});
    report.checks.push({name:'one-request-trip-intent',status:intentPass?'pass':'fail',http:response.status,ms:Date.now()-started,source:intent.source,action:intent.proposal?.action});
    if (!intentPass) throw new Error('Naru did not produce the requested grounded itinerary intent');
    const journeyStarted=Date.now();
    const journey=await post('/api/assistant/journey',{action:intent.proposal,context:{...context,profiles:[],themes:['nature']}});
    const events=(await journey.text()).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
    const journeyPass=validateJourney(journey.status,events,date,date);
    report.checks.push({name:'actual-itinerary-proposal',status:journeyPass?'pass':'fail',http:journey.status,ms:Date.now()-journeyStarted,placeIds:events.find(event=>event.type==='result')?.draft?.stops?.map(stop=>stop.place.id)||[]});
    if (!journeyPass) throw new Error('Journey response failed or has no usable result; HTTP success alone is insufficient');
    await new Promise(resolve=>setTimeout(resolve,6200));
    const countStarted=Date.now();
    const counted=await post('/api/assistant',{messages:[{role:'user',content:'통영에서 세 곳을 추천해줘. 창원과 거제는 제외해줘.'}],context});
    const count=await counted.json();
    const countPass=counted.ok && count.source==='local-llm' && count.proposal?.region==='통영' && count.proposal?.count===3;
    report.checks.push({name:'korean-count-and-region',status:countPass?'pass':'fail',http:counted.status,ms:Date.now()-countStarted,source:count.source,count:count.proposal?.count,region:count.proposal?.region});
    const after=await fetch(new URL('/api/health',base),{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(response=>response.json());
    if ((after.commit || null) !== report.commit) throw new Error('Production changed during the Naru check');
    report.status=report.checks.every(check=>check.status==='pass')?'pass':'fail';
  } catch(error) {
    report.checks.push({name:'completion',status:'fail',error:error instanceof Error?error.message:'Unknown check failure'});
  }
  const output=process.env.WAVE_NARU_REPORT || 'naru-live-result.json';
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  console.log('Scope: live intent + proposal only. Browser apply/undo and real-device usability require separate evidence.');
  if(report.status!=='pass') process.exitCode=1;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(error=>{console.error(error.message);process.exitCode=1;});
