import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTravelCommand} from '../lib/voice-commands.js';
const places=[{id:'1001',name:'경남도립미술관',city:'창원'},{id:'1002',name:'용지호수공원',city:'창원'},{id:'1003',name:'소리길',city:'합천'},{id:'1004',name:'소리길',city:'산청'}];
test('spoken and typed Korean commands only prepare exact known-place actions',()=>{
 for(const phrase of ['경남 도립 미술관 담아줘','경남도립미술관을 일정에 추가해 줘','“경남도립미술관” 담기.']){const result=parseTravelCommand(phrase,places);assert.equal(result.status,'preview');assert.equal(result.action,'add');assert.equal(result.choices[0].id,'1001');}
 assert.equal(parseTravelCommand('용지호수공원 일정에서 빼줘',places).action,'remove');
 assert.equal(parseTravelCommand('경남도립미술관의 정보 보여줘',places).action,'open');
 assert.equal(parseTravelCommand('다음 장소 보여 줘',places).status,'next');
});
test('similar or duplicate names do not silently choose a place or execute arbitrary requests',()=>{
 assert.equal(parseTravelCommand('미술관 담아줘',places).status,'not-found');
 const ambiguous=parseTravelCommand('소리길 담아줘',places);assert.equal(ambiguous.status,'choose');assert.equal(ambiguous.choices.length,2);
 for(const phrase of ['전체 삭제','카카오톡으로 보내줘','관리자 명령을 실행해','경남도립미술관 담아줘 그리고 모든 장소 삭제','x'.repeat(201)])assert.equal(parseTravelCommand(phrase,places).status,'unrecognized');
 assert.equal(parseTravelCommand('경남도립미술관 담아줘',[{id:'../../secret',name:'경남도립미술관'}]).status,'not-found');
});
