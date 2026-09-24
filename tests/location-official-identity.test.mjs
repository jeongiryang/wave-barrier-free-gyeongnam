import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const root=fileURLToPath(new URL("../",import.meta.url));
// Real adapter modules with one private fixture transport; no live API requests.
function loadServer(fetchFixture) {
  const cache=new Map();
  function load(name) {
    let file=resolve(root,name);if(!existsSync(file))file+=".ts";
    if(cache.has(file))return cache.get(file).exports;
    const mod={exports:{}};cache.set(file,mod);
    const code=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    new Function("module","exports","require","fetch",code)(mod,mod.exports,specifier=>{
      if(!specifier.startsWith("."))throw Error("Unexpected dependency");
      return load(resolve(dirname(file),specifier));
    },fetchFixture);
    return mod.exports;
  }
  return load;
}

const venue={contentid:'1001',title:'거제식물원',addr1:'경상남도 거제시 거제남서로 3595',mapx:'128.5791',mapy:'34.8572',lDongRegnCd:'48',contenttypeid:'12'};
const env={KAKAO_REST_API_KEY:'fixture',TOUR_API_SERVICE_KEY_ENCODED:'fixture'};
const payload=items=>Response.json({response:{header:{resultCode:'0000',resultMsg:'OK'},body:{items:{item:items},totalCount:items.length}}});
for(const failed of [false,true])test(`official direct search ${failed?'preserves Kakao when KTO fails':'resolves actual KTO ID outside recommendation'}`,async()=>{
 const calls=[];
 const load=loadServer(async(input)=>{
  const url=new URL(input);calls.push(url.pathname);
  if(url.hostname==='dapi.kakao.com')return Response.json({documents:[{id:'999',place_name:venue.title,road_address_name:venue.addr1,x:venue.mapx,y:venue.mapy,category_group_code:'AT4'}]});
  if(failed)return new Response('unavailable',{status:503});
  if(url.pathname.endsWith('searchKeyword2')||url.pathname.endsWith('detailCommon2'))return payload([venue]);
  return payload([{contentid:'1001',elevator:'승강기 있음'}]);
 });
 const result=await(await load('server/location/handler.ts').handleLocationSearch(new Request('https://wave.test/api/location-search?q=거제식물원&scope=gyeongnam&official=1&profiles=elevator'),env)).json();
 assert.equal(result.places[0].id,'999');
 if(failed){assert.equal(result.officialState,'error');assert.deepEqual(result.officialPlaces,[]);}
 else{assert.equal(result.officialPlaces[0].id,'1001');assert.equal(result.officialPlaces[0].accessibility[0].state,'confirmed');assert.equal(calls.length,4);}
});

test('actual-shaped museum road addresses resolve the official ID and facilities while its library remains separate', async () => {
  const museum = { contentid: '1622590', title: '경남도립미술관', addr1: '경상남도 창원시 의창구 용지로 296 (퇴촌동)', mapx: '128.6908827248', mapy: '35.2395039295', lDongRegnCd: '48', contenttypeid: '14' };
  const searched = { id: '23821302', place_name: museum.title, road_address_name: '경남 창원시 의창구 용지로 296', x: '128.69085550149', y: '35.2394650280721', category_group_code: 'CT1', category_name: '문화,예술 > 문화시설 > 미술관' };
  const requestedIds = [];
  const load = loadServer(async input => {
    const url = new URL(input);
    if (url.hostname === 'dapi.kakao.com') return Response.json({ documents: [searched, { ...searched, id: '10173325', place_name: '경남도립미술관 도서자료실' }] });
    if (url.pathname.endsWith('searchKeyword2')) return payload([museum]);
    requestedIds.push(url.searchParams.get('contentId'));
    if (url.pathname.endsWith('detailCommon2')) return payload([museum]);
    return payload([{ contentid: museum.contentid, restroom: '장애인 전용 화장실 있음' }]);
  });
  const response = await load('server/location/handler.ts').handleLocationSearch(new Request('https://wave.test/api/location-search?q=경남도립미술관&scope=gyeongnam&official=1&profiles=restroom'), env);
  const result = await response.json();
  assert.equal(result.officialState, 'available');
  assert.deepEqual(result.officialPlaces.map(place => place.id), ['1622590']);
  assert.equal(result.officialPlaces[0].accessibility[0].state, 'confirmed');
  assert.equal(result.officialPlaces[0].source, '무장애 여행정보 · 국문 관광정보');
  assert.ok(requestedIds.length > 0 && requestedIds.every(id => id === '1622590'));
  assert.equal(result.places.length, 2, 'The separately named library remains a search result without inheriting museum evidence.');
});

const flower = { contentid: '2758443', title: '대산플라워랜드', addr1: '경상남도 창원시 의창구 대산면 모산리', mapx: '128.75', mapy: '35.35', lDongRegnCd: '48', contenttypeid: '12' };
const flowerSearch = { id: 'kakao-flower', place_name: '대산 플라워랜드', address_name: `${flower.addr1} 4-11`, x: flower.mapx, y: String(Number(flower.mapy) + 11 / 111320), category_group_code: 'AT4' };
const searchRequest = query => new Request(`https://wave.test/api/location-search?${new URLSearchParams({ q: query, scope: 'gyeongnam', official: '1', profiles: 'route,restroom' })}`);

test('an exact Kakao venue with an empty spaced KTO search retries the compact keyword once and preserves official identity', async () => {
  const calls = [];
  const load = loadServer(async input => {
    const url = new URL(input); calls.push(url);
    if (url.hostname === 'dapi.kakao.com') return Response.json({ documents: [flowerSearch] });
    if (url.pathname.endsWith('searchKeyword2')) return payload(url.searchParams.get('keyword') === '대산플라워랜드' ? [flower] : []);
    if (url.pathname.endsWith('detailCommon2')) return payload([flower]);
    return payload([{ contentid: flower.contentid, route: '계단 없는 접근로', restroom: '장애인 전용 화장실 있음' }]);
  });
  const result = await (await load('server/location/handler.ts').handleLocationSearch(searchRequest('대산 플라워랜드'), env)).json();
  assert.deepEqual(calls.filter(url => url.pathname.endsWith('searchKeyword2')).map(url => url.searchParams.get('keyword')), ['대산 플라워랜드', '대산플라워랜드']);
  assert.equal(calls.length, 5, 'One extra keyword search; detail queries remain bounded to the canonical ID.');
  assert.equal(result.officialState, 'available');
  assert.deepEqual(result.officialPlaces.map(place => place.id), ['2758443']);
  assert.ok(result.officialPlaces[0].accessibility.every(item => item.state === 'confirmed'));
  assert.equal(result.places[0].id, flowerSearch.id);
  assert.ok(calls.filter(url => url.pathname.includes('searchKeyword')).every(url => url.searchParams.get('lDongRegnCd') === '48'));
});

test('spacing fallback is not a generic retry on failures, existing results, unrelated names or unspaced queries', async () => {
  for (const scenario of ['failure', 'existing', 'no-kakao', 'unrelated-name', 'unspaced', 'incomplete-total']) {
    const searches = [];
    const load = loadServer(async input => {
      const url = new URL(input);
      if (url.hostname === 'dapi.kakao.com') return Response.json({ documents: scenario === 'no-kakao' ? [] : [{ ...flowerSearch, ...(scenario === 'unrelated-name' ? { place_name: '대산플라워랜드 옆 카페' } : {}) }] });
      if (url.pathname.endsWith('searchKeyword2')) {
        searches.push(url.searchParams.get('keyword'));
        if (scenario === 'failure') return new Response('unavailable', { status: 503 });
        if (scenario === 'incomplete-total') return Response.json({ response: { header: { resultCode: '0000' }, body: { items: { item: [] }, totalCount: 3 } } });
        return payload(scenario === 'existing' ? [flower] : []);
      }
      if (url.pathname.endsWith('detailCommon2')) return payload([flower]);
      return payload([{ contentid: flower.contentid }]);
    });
    const result = await (await load('server/location/handler.ts').handleLocationSearch(searchRequest(scenario === 'unspaced' ? '대산플라워랜드' : '대산 플라워랜드'), env)).json();
    assert.equal(searches.length, 1, scenario);
    if (scenario === 'failure') assert.equal(result.officialState, 'error');
  }
});

test('compact keyword candidates still cannot bypass locality, distance or canonical ambiguity', async () => {
  for (const scenario of ['different-locality', 'distant', 'ambiguous']) {
    const searches = [], detailCalls = [];
    const candidate = { ...flower, ...(scenario === 'different-locality' ? { addr1: '경상남도 창원시 의창구 대산면 가술리' } : scenario === 'distant' ? { mapy: String(Number(flower.mapy) + 100 / 111320) } : {}) };
    const load = loadServer(async input => {
      const url = new URL(input);
      if (url.hostname === 'dapi.kakao.com') return Response.json({ documents: [flowerSearch] });
      if (url.pathname.endsWith('searchKeyword2')) {
        searches.push(url.searchParams.get('keyword'));
        return payload(searches.length === 1 ? [] : scenario === 'ambiguous' ? [candidate, { ...candidate, contentid: '2758444' }] : [candidate]);
      }
      detailCalls.push(url.pathname); throw Error('Unmatched candidates must not trigger facility lookups');
    });
    const result = await (await load('server/location/handler.ts').handleLocationSearch(searchRequest('대산 플라워랜드'), env)).json();
    assert.equal(searches.length, 2, scenario);
    assert.deepEqual(detailCalls, [], scenario);
    assert.deepEqual(result.officialPlaces, [], scenario);
    assert.equal(result.places.length, 1, 'Kakao evidence stays available without false facility inheritance.');
  }
});

test('a failed compact search keeps the original Kakao result and exposes official failure', async () => {
  let searches = 0;
  const load = loadServer(async input => {
    const url = new URL(input);
    if (url.hostname === 'dapi.kakao.com') return Response.json({ documents: [flowerSearch] });
    assert.ok(url.pathname.endsWith('searchKeyword2'));
    return ++searches === 1 ? payload([]) : new Response('unavailable', { status: 503 });
  });
  const result = await (await load('server/location/handler.ts').handleLocationSearch(searchRequest('대산 플라워랜드'), env)).json();
  assert.equal(searches, 2);
  assert.equal(result.officialState, 'error');
  assert.deepEqual(result.officialPlaces, []);
  assert.equal(result.places[0].id, flowerSearch.id);
});
