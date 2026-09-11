import assert from 'node:assert/strict';
import test from 'node:test';
import {knownWon,cleanBudget,summarizeBudget,readBudget,writeBudget,budgetIdentity,TRIP_BUDGET_KEY} from '../lib/trip-budget.js';
const days=['2026-10-08','2026-10-09'],places=[{id:'1001',name:'공원'},{id:'1002',name:'미술관'}];
test('known money preserves explicit zero and refuses blanks, booleans, fractions and coercible objects',()=>{
  for(const value of [null,undefined,'',true,false,[],{},'1e3','-1','0x10','1.5',100000001])assert.equal(knownWon(value),null);
  assert.equal(knownWon(0),0);assert.equal(knownWon('2500'),2500);
});
test('budget separates people and vehicle amounts, route tolls and fares, missing costs and per-day totals',()=>{
  const budget=cleanBudget({people:3,target:30000,targetBasis:'person',admissions:{'1001':{amount:0,basis:'person'},'1002':{amount:5000,basis:'person'}},extras:[{id:'meal',day:days[0],category:'food',amount:18000,basis:'group',label:'점심'},{id:'dinner',day:days[1],category:'food',amount:null,basis:'person',label:'저녁'}]},places.map(p=>p.id),days);
  const result=summarizeBudget({places,days,assignments:{'1002':days[1]},budget,routes:{'1001':{configured:true,payment:1500,paymentType:'fare'},'1002':{configured:true,payment:2000,paymentType:'toll'}}});
  assert.equal(result.total,39500);assert.equal(result.target,90000);assert.equal(result.remaining,50500);assert.equal(result.unknown,1);assert.equal(result.days[0].total,22500);assert.equal(result.days[1].total,17000);
  assert.match(result.rows.find(row=>row.id==='route-1002').source,/연료·주차 별도/);
  const missing=summarizeBudget({places,days,budget,routes:{'1001':{configured:false,payment:0,paymentType:'fare'},'1002':{configured:true,payment:0}}});assert.equal(missing.unknown,3);
  const over=summarizeBudget({places,days,budget:{...budget,target:1000,targetBasis:'group'}});assert.ok(over.remaining<0);
  const outside=summarizeBudget({places,days,budget,assignments:{'1002':'2026-10-10'}});assert.equal(outside.outOfPeriod,1);assert.equal(outside.rows.filter(row=>row.placeId==='1002').length,0);
});
test('budget saves scope without modifying itinerary or retaining costs for removed places or invalid dates',()=>{
  const store=new Map([['wave-current-trip-v1','untouched']]),storage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
  const identity=budgetIdentity(places,days),ids=places.map(p=>p.id),input={people:2,admissions:{'1001':{amount:0},'bad':{amount:9}},extras:[{id:'wrong',category:'other',day:'2099-01-01',amount:20}]};
  for(let i=0;i<30;i++)writeBudget(storage,identity+i,input,ids,days);
  writeBudget(storage,identity,input,ids,days);const saved=readBudget(storage,identity,ids,days);
  assert.equal(JSON.parse(store.get(TRIP_BUDGET_KEY)).length,20);assert.deepEqual(Object.keys(saved.admissions),['1001']);assert.equal(saved.extras.length,0);assert.equal(store.get('wave-current-trip-v1'),'untouched');
  const blocked={...storage,getItem(){throw new Error('blocked');}},before=store.get(TRIP_BUDGET_KEY);
  assert.throws(()=>readBudget(blocked,identity,ids,days,true),/blocked/);assert.throws(()=>writeBudget(blocked,identity,{},ids,days),/blocked/);assert.equal(store.get(TRIP_BUDGET_KEY),before);
});
