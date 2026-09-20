import test from 'node:test';
import assert from 'node:assert/strict';
import { gentleTripPlan } from '../lib/naru-gentle-plan.js';
import { validateJourneyApplication } from '../lib/naru-journey.js';

const days = ['2026-09-21','2026-09-22'];
const places = Array.from({length:6},(_,i)=>({id:String(1000+i),name:`장소 ${i}`,contentTypeId:'12',mapX:String(128.1+i*.01),mapY:'35.2'}));
const assignments = Object.fromEntries(places.map(place=>[place.id,days[0]]));
const base = {places,days,assignments};
test('burden reduction spreads visits while preserving every venue, fixed position and duration',()=>{
  const before=JSON.stringify(base);
  const plan=gentleTripPlan({...base,fixed:{1002:{time:'14:00'}},visits:{1002:180},breaks:{1001:45}});
  assert.deepEqual([...plan.order].sort(),places.map(p=>p.id));
  assert.equal(plan.order.indexOf('1002'),2);
  assert.equal(plan.assignments['1002'],days[0]);
  assert.equal(Object.values(plan.assignments).filter(date=>date===days[1]).length,3);
  assert.equal(plan.changes.find(item=>item.id==='1002').minutes,180);
  assert.equal(plan.changes.find(item=>item.id==='1000').minutes,90);
  assert.equal(plan.changes.find(item=>item.id==='1001').breakAfter,45);
  assert.equal(JSON.stringify(base),before);
});
test('explicit day limits changes and a festival never moves outside its actual dates',()=>{
  const festivals=places.map(p=>({...p,contentTypeId:'15',startDate:days[0],endDate:days[0]}));
  assert.deepEqual(gentleTripPlan({...base,places:festivals}).assignments,assignments);
  const plan=gentleTripPlan({...base,targetDay:days[0],assignments:{...assignments,1005:days[1]},breaks:{1005:5}});
  assert.equal(plan.changes.find(item=>item.id==='1005').breakAfter,5);
  assert.equal(plan.assignments['1004'],days[0]);
});
test('reviewed adjustment rejects missing venues, invalid dates, fixed moves and malformed payloads',()=>{
  const state={saved:places.map(p=>p.id),fixed:{1002:{time:'14:00'}},assignments,start:days[0]};
  const adjustment=gentleTripPlan({...base,fixed:state.fixed});
  const draft={start:days[0],end:days[1],restOnly:true,stops:[],adjustment};
  assert.equal(validateJourneyApplication(draft,state),'');
  for(const bad of [{},{...adjustment,order:adjustment.order.slice(1)},{...adjustment,assignments:{...adjustment.assignments,1002:days[1]}},{...adjustment,assignments:{...adjustment.assignments,1001:'2030-01-01'}},{...adjustment,order:[...adjustment.order].reverse()}]) {
    assert.ok(validateJourneyApplication({...draft,adjustment:bad},state));
  }
});

test('distance comparison resets each day and includes the selected origin on each visit day', () => {
  const points = [1, 3, 2, 4].map((step, index) => ({id:String(index), name:`장소 ${index}`, mapX:'128.1', mapY:String(35.2 + step * .01)}));
  const input = {places:points, days, assignments:{0:days[0], 1:days[0], 2:days[0], 3:days[1]}, targetDay:days[0]};
  const plan = gentleTripPlan({...input, origin:{lng:128.1, lat:35.2}});
  const oneStepKm = 6371 * Math.PI / 180 * .01;
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
  near(plan.distance.before.totalKm, 8 * oneStepKm);
  near(plan.distance.after.totalKm, 7 * oneStepKm);
  near(plan.distance.before.longestLegKm, 4 * oneStepKm);
  near(plan.distance.after.longestLegKm, 4 * oneStepKm);
  assert.equal(plan.distance.after.originIncluded, true);
  const withoutOrigin = gentleTripPlan(input);
  near(withoutOrigin.distance.before.totalKm, 3 * oneStepKm);
  near(withoutOrigin.distance.after.totalKm, 2 * oneStepKm);
  near(withoutOrigin.distance.before.longestLegKm, 2 * oneStepKm);
  near(withoutOrigin.distance.after.longestLegKm, oneStepKm);
  assert.equal(withoutOrigin.distance.after.originIncluded, false);
});

test('missing coordinates never produce a partial trip distance, including an isolated daily stop', () => {
  const incomplete = [{...places[0]}, {...places[1], mapX:''}];
  const input = {places:incomplete, days, assignments:{[incomplete[0].id]:days[0], [incomplete[1].id]:days[1]}};
  assert.deepEqual(gentleTripPlan(input).distance, {before:null, after:null});
  assert.deepEqual(gentleTripPlan({...base, origin:{lat:35.2}}).distance, {before:null, after:null});
  assert.ok(gentleTripPlan({...base, origin:{}}).distance.after);
});

test('proposal warns about empty days and certain midnight overruns without estimating travel time', () => {
  const input = {places:[places[0]], days, assignments, startTime:'23:00', targetDay:days[0], visits:{1000:60}};
  const plan = gentleTripPlan(input);
  assert.equal(plan.warnings.length, 2);
  assert.match(plan.warnings[0], /09-21.*이동시간을 제외.*자정/);
  assert.match(plan.warnings[1], /09-22.*방문 장소가 없/);
  assert.equal(plan.changes[0].minutes, 60);
  assert.equal(plan.changes[0].breakAfter, 20);
  const short = {...input, days:[days[0]], visits:{1000:15}};
  assert.deepEqual(gentleTripPlan(short).warnings, []);
  assert.match(gentleTripPlan({...short, fixed:{1000:{time:'23:50'}}}).warnings[0], /자정/);
  assert.deepEqual(gentleTripPlan({...short, startTime:undefined}).warnings, []);
});
