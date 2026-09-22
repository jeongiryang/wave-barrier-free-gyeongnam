import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = new Map();
function load(name) {
  let file = resolve(root, name);
  if (!existsSync(file)) file += '.ts';
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', 'require', code)(mod, mod.exports, specifier => {
    if (!specifier.startsWith('.')) throw Error(`Unexpected dependency: ${specifier}`);
    return load(resolve(dirname(file), specifier));
  });
  return mod.exports;
}
const { placeFrom } = load('server/tourism/accessibility-model.ts');
const item = { contentid: '1748884', title: '합성 시설 안내 장소', addr1: '경상남도 창원시' };

test('facility evidence renders provider line breaks, formatting tags and entities as readable text', () => {
  for (const separator of ['<br>', '<br/>', '<br />', '<BR />']) {
    const source = `장애인 전용 화장실 있음${separator}<b>1층</b>&nbsp;안내소&#160;&amp; 전시실 옆`;
    const detail = { restroom: source, elevator: '승강기 있음<br />본관 입구' }, snapshot = structuredClone(detail);
    const place = placeFrom(item, detail, '창원', ['restroom', 'elevator'], 0);
    assert.equal(place.accessibility.find(field => field.key === 'restroom').detail, '장애인 전용 화장실 있음 1층 안내소 & 전시실 옆');
    assert.equal(place.accessibility.find(field => field.key === 'elevator').detail, '승강기 있음 본관 입구');
    assert.deepEqual(detail, snapshot, 'Provider records must remain unchanged.');
  }
});

test('text cleanup keeps explicit absence, unknown fields and evidence counts unchanged', () => {
  const place = placeFrom(item, { restroom: '장애인 화장실 없음<br/>안내소 문의', elevator: '정보 없음', parking: '' }, '창원', ['restroom', 'elevator', 'parking'], 0);
  assert.deepEqual(place.accessibility.map(({ key, state }) => ({ key, state })), [
    { key: 'restroom', state: 'negative' }, { key: 'elevator', state: 'unknown' }, { key: 'parking', state: 'unknown' },
  ]);
  assert.equal(place.accessibility[0].detail, '장애인 화장실 없음 안내소 문의');
  assert.equal(place.knownFields, 1); assert.equal(place.negativeFields, 1); assert.equal(place.unknownFields, 2);
  assert.equal(place.score, 0);
  const missing = placeFrom(item, {}, '창원', ['restroom'], 0);
  assert.equal(missing.accessibility[0].state, 'unknown'); assert.equal(missing.accessibility[0].detail, ''); assert.equal(missing.score, null);
});

test('facility text retains its bounds and the existing longer route evidence allowance', () => {
  const detail = { restroom: `화장실 있음<br />${'상세 안내 '.repeat(90)}`, route: `접근로 있음<br />${'입구 안내 '.repeat(90)}` };
  const place = placeFrom(item, detail, '창원', ['restroom', 'route'], 0);
  assert.equal(place.accessibility.find(field => field.key === 'restroom').detail.length, 300);
  const route = place.accessibility.find(field => field.key === 'route');
  assert.ok(route.detail.length > 300); assert.ok(route.detail.length <= 600);
  assert.doesNotMatch(JSON.stringify(place.accessibility), /<br/);
});
