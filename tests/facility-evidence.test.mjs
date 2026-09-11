import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { stripVisitPhotoMetadata, normalizeVisitPhotos, MAX_VISIT_PHOTO_BYTES } from '../lib/community/visit-photos.js';
import { facilityHistory, parseFieldReportDraft, fieldReportDraftHref } from '../lib/community/facility-history.js';
import { validatePostInput, communityListParams } from '../lib/community/validation.js';

const fixture = JSON.parse(readFileSync(new URL('./visit-photo-fixture.json', import.meta.url), 'utf8'));
const bytes = Buffer.from(fixture.split(',')[1], 'base64');
const dataUrl = value => 'data:image/jpeg;base64,' + Buffer.from(value).toString('base64');
const photo = { dataUrl: fixture, caption: '출입구 옆의 완만한 경사로' };
const now = Date.parse('2026-09-11T12:00:00Z');
const post = { category: 'review', title: '현장에서 직접 확인한 시설', content: '입구에서 화장실까지 직접 이동하며 확인했어요.', region: '창원', placeId: '1001', placeName: '경남도립미술관', visitDate: '2026-09-10', photoConsent: true, visitPhotos: [photo] };

test('actual canvas JPEG remains decodable in shape while EXIF/APP/COM payloads are removed', () => {
  const metadata = Buffer.from('Exif\0\0GPS:private-location-camera');
  const app = Buffer.concat([Buffer.from([255,225,0,metadata.length + 2]), metadata]);
  const comment = Buffer.from([255,254,0,5,65,66,67]);
  const result = stripVisitPhotoMetadata(dataUrl(Buffer.concat([bytes.subarray(0,2),app,comment,bytes.subarray(2)])));
  assert.equal(result.width, 64); assert.equal(result.height, 48);
  const safe = Buffer.from(result.dataUrl.split(',')[1], 'base64');
  assert.equal(safe.includes(metadata), false); assert.equal(safe.includes(comment), false);
  assert.equal(stripVisitPhotoMetadata(result.dataUrl).dataUrl, result.dataUrl);
});

test('unsupported, oversize, truncated, progressive and trailing-content photo containers fail closed', () => {
  for (const value of ['data:image/svg+xml,<svg/>', fixture + '\n', fixture.slice(0,-3), dataUrl(bytes.subarray(0,-2)), dataUrl(Buffer.concat([bytes,Buffer.from('<script>')]))]) assert.throws(() => stripVisitPhotoMetadata(value));
  const progressive = Buffer.from(bytes); progressive[progressive.indexOf(Buffer.from([255,192])) + 1] = 194;
  assert.throws(() => stripVisitPhotoMetadata(dataUrl(progressive)));
  const tooWide = Buffer.from(bytes), frame = tooWide.indexOf(Buffer.from([255,192])); tooWide[frame+7] = 4; tooWide[frame+8] = 0;
  assert.throws(() => stripVisitPhotoMetadata(dataUrl(tooWide)));
  assert.throws(() => stripVisitPhotoMetadata(dataUrl(Buffer.alloc(MAX_VISIT_PHOTO_BYTES+1,255))));
  assert.ok(normalizeVisitPhotos([photo,photo,photo]).error);
  assert.ok(normalizeVisitPhotos([{...photo,caption:' \n'}]).error);
  assert.equal(normalizeVisitPhotos([{...photo,caption:'  계단\0 없는 입구  '}]).photos[0].caption,'계단 없는 입구');
});

test('photo publication needs explicit confirmation, primary place and actual past visit date; old clients preserve omission', () => {
  assert.equal(validatePostInput(post,now).value.visitPhotos.length,1);
  for(const change of [{photoConsent:false},{photoConsent:'true'},{visitDate:''},{visitDate:'2026-09-12'},{placeId:'',placeName:''},{category:'place'}]) assert.ok(validatePostInput({...post,...change},now).error);
  assert.deepEqual(validatePostInput({...post,visitPhotos:[]},now).value.visitPhotos,[]);
  const legacy = {...post}; delete legacy.visitPhotos;
  assert.equal(Object.hasOwn(validatePostInput(legacy,now).value,'visitPhotos'),false);
});

test('facility history orders actual visit dates, separates contradictory same-day accounts and excludes unrelated/future records', () => {
  const row = (id,visitDate,status,createdAt=1) => ({...post,id,visitDate,createdAt,authorName:'여행자',fieldReports:[{field:'entrance',status,note:id}]});
  const rows=[row('older','2026-09-01','confirmed',99),row('same-day-yes','2026-09-10','confirmed',1),row('same-day-change','2026-09-10','changed',2),row('future','2026-09-12','confirmed'),{...row('secondary','2026-09-11','confirmed'),placeId:'1002',journalPlaces:[{id:'1001'}]},row('no-date','','changed')];
  const history=facilityHistory(rows,'1001',now),entrance=history.find(item=>item.field==='entrance');
  assert.equal(entrance.latest.postId,'same-day-change'); assert.equal(entrance.ageDays,1); assert.equal(entrance.conflict,true);
  assert.deepEqual(entrance.observations.map(item=>item.postId),['same-day-change','same-day-yes','older']);
  assert.equal(history.find(item=>item.field==='toilet').latest,null);
  const unknown=facilityHistory([...rows,row('unknown','2026-09-11','not_checked')],'1001',now)[0];
  assert.equal(unknown.latest.status,'not_checked'); assert.equal(unknown.conflict,false);
});

test('only explicit bounded history requests and recognized report drafts are accepted', () => {
  const href=fieldReportDraftHref({placeId:'1001',placeName:'미술관',region:'창원',field:'entrance',status:'changed'});
  const params=new URL('https://wave.test'+href).searchParams;
  assert.deepEqual(parseFieldReportDraft(params),[{field:'entrance',status:'changed',note:''}]);
  assert.equal(params.has('visitDate'),false);
  assert.deepEqual(parseFieldReportDraft(new URLSearchParams('placeId=1001&field=gps&observation=changed')),[]);
  assert.equal(communityListParams(new URL('https://wave.test?placeId=1001&history=1&limit=999')).history,true);
  assert.equal(communityListParams(new URL('https://wave.test?history=1')).history,undefined);
});
