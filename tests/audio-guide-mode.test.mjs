import assert from 'node:assert/strict';
import test from 'node:test';
import { audioGuideKeySentences, audioGuideModeForPreferences } from '../lib/audio-guide-mode.js';

test('문자·쉬운 설명·음성 우선 설정을 Odii 해설 모드로 연결한다', () => {
  assert.equal(audioGuideModeForPreferences({ audioFirst: true }), 'audio');
  assert.equal(audioGuideModeForPreferences({ easyNarration: true }), 'easy');
  assert.equal(audioGuideModeForPreferences({ oneAtATime: true }), 'easy');
  assert.equal(audioGuideModeForPreferences({ textFirst: true, audioFirst: true }), 'text');
});

test('쉬운 설명은 Odii 원문 문장만 줄여 보여주고 새 사실을 만들지 않는다', () => {
  assert.deepEqual(audioGuideKeySentences('첫 문장입니다. 둘째 문장입니다! 셋째 문장입니다?', 2), ['첫 문장입니다.', '둘째 문장입니다!']);
  assert.deepEqual(audioGuideKeySentences(''), []);
});
