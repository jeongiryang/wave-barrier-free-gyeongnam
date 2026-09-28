import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRouteLines } from '../lib/map-route-lines.js';
const road = (geometry) => ({ configured: true, mode: 'car', provider: 'Kakao Mobility', geometry });
const a = [{lat:35.2,lng:128.6},{lat:35.3,lng:128.7}];
const b = [{lat:35.4,lng:128.8},{lat:35.5,lng:128.9}];
test('missing routes produce no invented straight road',()=>assert.deepEqual(mapRouteLines({configured:false,geometry:a}),[]));
test('separate real legs stay separate without bridging missing sections',()=>{
 const lines=mapRouteLines(road(a),[road(a),road(b)]);
 assert.deepEqual(lines.map(line=>line.geometry),[a,b]);
 assert.ok(lines.every(line=>line.road));
});
test('transit stop connections cannot be labelled as road geometry',()=>{
 assert.equal(mapRouteLines({configured:true,provider:'ODsay',mode:'transit',geometry:a})[0].road,false);
});
test('invalid geometry is not drawn',()=>assert.deepEqual(mapRouteLines(road([{lat:NaN,lng:128},...a])),[]));
