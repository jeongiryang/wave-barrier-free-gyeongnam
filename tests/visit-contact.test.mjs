import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import * as contact from '../lib/parking-contact.js';

const source = readFileSync(new URL('../features/planner/components/VisitHoursCard.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', 'require', code)(loaded, loaded.exports, name => {
  if (name.endsWith('/parking-contact.js')) return contact;
  if (['react', 'react/jsx-runtime', '../../../lib/visit-hours.js', '../optimization/itinerary-schedule.js', '../services/visit-info'].includes(name)) return {};
  throw Error(`Unexpected contact helper dependency: ${name}`);
});
const { visitContactParts } = loaded.exports;
const hrefs = value => visitContactParts(value).flatMap(part => part.href ? [part.href] : []);

test('actual official institution-prefixed contact keeps every character and links only the number', () => {
  const value = '창원시청 관광과 055-225-3691';
  assert.deepEqual(visitContactParts(value), [{ text: '창원시청 관광과 ', href: null }, { text: '055-225-3691', href: 'tel:0552253691' }]);
  assert.equal(visitContactParts(value).map(part => part.text).join(''), value);
});

test('multiple complete official numbers stay separate with labels and separators intact', () => {
  const value = '운영 055-225-3691 / 예약 02-1234-5678, 안내 1588-1234';
  assert.deepEqual(hrefs(value), ['tel:0552253691', 'tel:0212345678', 'tel:15881234']);
  assert.equal(visitContactParts(value).map(part => part.text).join(''), value);
  assert.deepEqual(hrefs('문의 (055) 298-7111 / 해외 +82-55-298-7111'), ['tel:0552987111', 'tel:+82552987111']);
  assert.deepEqual(hrefs('0552987111'), ['tel:0552987111']);
});

test('ambiguous ranges, extensions, partial numbers, fax and unsafe tokens remain unlinked text', () => {
  for (const value of ['055-225-3691~3', '055-225-3691/2', '055-225-3691 내선 12', '055-225-3691 ext 12', '055-225-3691 (내선 12)', '055-225-3691（ext. 12）', '055-225', '문의 필요', '055-225-369123', 'ABC055-225-3691', '055-225-3691ABC', '055-225-3691.5', '팩스 055-225-3691', 'fax:055-225-3691', '팩스번호: 055-225-3691', 'FAX：055-225-3691', 'https://example.test/055-225-3691', 'javascript:0552253691', 'tel:0552253691']) {
    assert.deepEqual(hrefs(value), [], value);
    assert.equal(visitContactParts(value).map(part => part.text).join(''), value);
  }
  const mixed = '전화 055-225-3691 / 팩스 055-225-3692';
  assert.deepEqual(hrefs(mixed), ['tel:0552253691']);
  assert.equal(visitContactParts(mixed).map(part => part.text).join(''), mixed);
});
