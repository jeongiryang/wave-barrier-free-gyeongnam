import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingAudioStories } from '../lib/odii-evidence.js';

const place = (patch = {}) => ({ name: '경남도립미술관', mapX: '128.691', mapY: '35.238', ...patch });
const story = (patch = {}) => ({ stid: 'synthetic-story', title: '경남도립미술관', mapX: '128.6911', mapY: '35.2381', audioUrl: 'https://synthetic.invalid/audio.mp3', script: '', ...patch });

test('an exact nearby venue can be associated without treating audio chapter wording as the venue name', () => {
  const exact = story({ audioTitle: '건축과 전시' }), subtitle = story({ stid: 'subtitle', title: '경남도립미술관 - 건축과 전시' });
  assert.deepEqual(matchingAudioStories([exact, subtitle], place()), [exact, subtitle]);
});

test('valid transcript-only stories remain usable even without an audio file', () => {
  const textOnly = story({ audioUrl: '', script: '합성 대본: 이 전시관의 건축과 작품을 소개합니다.' });
  assert.deepEqual(matchingAudioStories([textOnly], place()), [textOnly]);
});

test('an exact homonym far away cannot be associated with the current venue', () => {
  const far = story({ mapX: '126.977', mapY: '37.566' });
  assert.deepEqual(matchingAudioStories([far], place()), []);
  assert.deepEqual(matchingAudioStories([{ ...far, mapX: undefined, mapY: undefined, lng: 126.977, lat: 37.566 }], place()), []);
});

test('Changwon and Hadong substrings do not identify Hyochangwon or Hadong House, even at nearby coordinates', () => {
  for (const [requested, returned] of [['창원', '효창원'], ['하동', '하동고택']]) {
    assert.deepEqual(matchingAudioStories([story({ title: returned })], place({ name: requested })), [], `${requested} is not ${returned}`);
  }
});

test('a fuzzy title without coordinates cannot borrow a location from the requested place', () => {
  const missing = story({ title: '경남도립미술관의 건축 이야기', mapX: '', mapY: '' });
  assert.deepEqual(matchingAudioStories([missing], place()), []);
  assert.deepEqual(matchingAudioStories([story({ title: '효창원', mapX: undefined, mapY: undefined })], place({ name: '창원' })), []);
});

test('a coordinate-free exact title can retain a real transcript without claiming a distance', () => {
  const exact = story({ mapX: undefined, mapY: undefined, audioUrl: '', script: '합성 전시관 해설 대본입니다.' });
  assert.deepEqual(matchingAudioStories([exact], place()), [exact]);
});

test('parenthetical region disambiguation cannot be erased when coordinates are missing', () => {
  const requested = place({ name: '중앙공원 (창원)' });
  const other = story({ title: '중앙공원 (통영)', mapX: undefined, mapY: undefined });
  assert.deepEqual(matchingAudioStories([other], requested), []);
});

test('blank or markup-only transcripts are not usable story evidence', () => {
  for (const script of ['', ' \n\t ', '<p><br></p>', '&nbsp;']) {
    assert.deepEqual(matchingAudioStories([story({ audioUrl: '', script })], place()), [], JSON.stringify(script));
  }
});

test('a malformed audio URL without a transcript cannot make an empty story available', () => {
  for (const audioUrl of ['not-a-url', 'javascript:alert(1)', '   ']) assert.deepEqual(matchingAudioStories([story({ audioUrl, script: '' })], place()), []);
});

test('matching preserves input records and provider order while bounding the result count', () => {
  const items = Array.from({ length: 8 }, (_, index) => story({ stid: String(index) })), requested = place();
  const before = JSON.stringify({ items, requested });
  assert.deepEqual(matchingAudioStories(items, requested).map(item => item.stid), ['0', '1', '2', '3', '4']);
  assert.equal(JSON.stringify({ items, requested }), before);
});
