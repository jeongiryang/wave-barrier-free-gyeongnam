import assert from 'node:assert/strict';
import test from 'node:test';
import {nearbyReturnStops,groupReturnArrivals,returnRouteDirection,nearbyDownstreamStops,originBusTimes,returnArrivalLabel} from '../lib/transport/return-transport.js';

test('return stops bind public identity and preserve unknown rather than zero distance',()=>{
 const stops=nearbyReturnStops([{nodeid:'CW1',citycode:38010,nodenm:'정문',gpslong:128.68,gpslati:35.23},{nodeid:'CW1',citycode:38010,nodenm:'중복'},{nodeid:'CW2',citycode:38010,nodenm:'건너편'},{nodeid:'far',citycode:38010,nodenm:'먼 곳',gpslong:129.5,gpslati:35.5}],{lat:35.23,lng:128.68});
 assert.deepEqual(stops.map(item=>item.nodeId),['CW1','CW2']);assert.equal(stops[0].distance,0);assert.equal(stops[1].distance,null);
});
test('same route ID groups the next two vehicles, different identities and unknown arrivals stay separate',()=>{
 const list=groupReturnArrivals([{routeid:'R1',routeno:'100',nodeid:'CW1',arrtime:300,arrprevstationcnt:2},{routeid:'R1',routeno:'100',nodeid:'CW1',arrtime:0,arrprevstationcnt:0},{routeid:'R1',routeno:'100',nodeid:'WRONG',arrtime:1},{routeid:'R2',routeno:'100',nodeid:'CW1',arrtime:'',arrprevstationcnt:''}],'CW1');
 assert.equal(list.length,2);assert.deepEqual(list[0].vehicles.map(item=>item.seconds),[0,300]);assert.equal(list[0].vehicles[0].stopsAway,0);assert.equal(list[1].vehicles[0].seconds,null);
});
const route=[{routeid:'R1',nodeid:'CW1',nodenm:'정문',nodeord:1,updowncd:0,gpslong:128.68,gpslati:35.23},{routeid:'R1',nodeid:'CW2',nodenm:'시청',nodeord:2,updowncd:0,gpslong:128.681,gpslati:35.23},{routeid:'R1',nodeid:'CW3',nodenm:'광장',nodeord:1,updowncd:1,gpslong:128.68,gpslati:35.24}];
test('direction follows ordered branch only; loops, partial rows and repeated sequence are unconfirmed',()=>{
 const result=returnRouteDirection(route,'R1','CW1');assert.equal(result.next.nodeId,'CW2');assert.deepEqual(result.stops.map(stop=>stop.nodeId),['CW2']);
 for(const [items,complete] of [[route,false],[[...route,{...route[2],nodeid:'CW1'}],true],[[...route,{...route[1],nodeid:'CW4'}],true],[[...route,{nodeid:'invalid'}],true]])assert.equal(returnRouteDirection(items,'R1','CW1',complete).status,'unconfirmed');
 assert.equal(returnRouteDirection(route,'R1','CW2').status,'terminal');
 assert.equal(nearbyDownstreamStops(result,{mapX:'128.681',mapY:'35.23'})[0].distance,0);
 assert.deepEqual(nearbyDownstreamStops(result,{mapX:'',mapY:''}),[]);
});
test('arrival and sequence numbers accept decimal provider values only',()=>{
 for(const value of [false,true,[],[0],{},'0x10','1e2','',null,Infinity,-1]) {
  const vehicle=groupReturnArrivals([{routeid:'R1',routeno:'100',arrtime:value,arrprevstationcnt:value}],'CW1')[0].vehicles[0];
  assert.equal(vehicle.seconds,null);assert.equal(vehicle.stopsAway,null);
  assert.equal(returnRouteDirection([{...route[0],nodeord:value},route[1]],'R1','CW1').status,'unconfirmed');
 }
 for(const value of [0,'0',300,' 300 '])assert.equal(groupReturnArrivals([{routeid:'R1',routeno:'100',arrtime:value}],'CW1')[0].vehicles[0].seconds,Number(value));
});
test('arrival labels age locally and do not call an absent bus a stopped service; schedule is origin-only data',()=>{
 const stamp='2026-09-11T00:00:00Z',now=Date.parse(stamp);
 assert.match(returnArrivalLabel(0,stamp,now),/조회 시점에 도착 예정/);assert.match(returnArrivalLabel(null,stamp,now),/미확인/);
 assert.match(returnArrivalLabel(180,stamp,now+60000),/2분/);assert.match(returnArrivalLabel(120,stamp,now+180000),/시각 지남/);
 assert.match(returnArrivalLabel(120,stamp,now+300001),/오래된/);assert.match(returnArrivalLabel(120,'bad',now),/오래된/);
 assert.deepEqual(originBusTimes({startnodenm:'기점',endnodenm:'종점',startvehicletime:'0630',endvehicletime:'2401'}),{origin:'기점',destination:'종점',first:'06:30',last:''});
});
