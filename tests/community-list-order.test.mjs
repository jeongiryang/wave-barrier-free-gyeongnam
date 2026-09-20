import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { communityListParams } from '../lib/community/validation.js';

test('only supported sort and place-scoped preview options reach the repository', () => {
  const parse = query => communityListParams(new URL(`https://wave.test/api/community/posts?${query}`));
  assert.equal(parse('sort=popular&page=2').sort, 'popular');
  assert.equal(parse('sort=comments&page=2').offset, 12);
  assert.equal(parse('sort=DROP%20TABLE').sort, undefined);
  assert.equal(parse('placePreview=1').placePreview, undefined);
  assert.equal(parse('placePreview=1&placeId=123').placePreview, true);
});

test('every normal list orders before LIMIT and place preview keeps the flag in its single query', async () => {
  const source=readFileSync(new URL('../features/community/server/post-read-repository.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  let calls=[];
  const sql=async (strings,...values)=>{calls.push({query:strings.join('?'),values});return [];};
  const loaded={exports:{}};
  new Function('require','module','exports',compiled)(name=>name.includes('database')?{communityDatabase:async()=>sql}:name.includes('post-mappers')?{mapCommunityPost:x=>x}: {communitySearchPattern:x=>`%${x}%`},loaded,loaded.exports);
  const base={category:'',search:'',placeId:'',limit:12,offset:12,page:2,sort:'popular'};
  for (const fields of [{},{category:'review'},{search:'통영'},{category:'review',search:'통영'},{placeId:'123'},{placeId:'123',category:'review'}]) {
    await loaded.exports.listCommunityPosts({...base,...fields},'');
    const {query,values}=calls.at(-1);
    assert.match(query,/ORDER BY CASE WHEN[\s\S]*community_likes[\s\S]*community_comments[\s\S]*p.id DESC LIMIT/);
    assert.ok(values.includes(true));
  }
  calls=[];
  await loaded.exports.listCommunityPosts({...base,placeId:'123',placePreview:true},'',{fieldReportEnabled:false});
  assert.equal(calls.length,1);
  assert.match(calls[0].query,/PARTITION BY \(p.category='field-report'\)/);
  assert.match(calls[0].query,/\? OR p.category <> 'field-report'/);
  assert.ok(calls[0].values.includes(false));
});
