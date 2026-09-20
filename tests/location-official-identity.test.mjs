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
