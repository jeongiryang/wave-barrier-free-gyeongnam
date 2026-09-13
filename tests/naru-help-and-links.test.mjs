import test from 'node:test';
import assert from 'node:assert/strict';
import { NARU_HELP, naruLocalHelp } from '../lib/naru-help.js';
import { festivalSources, festivalWebsite } from '../lib/festival-links.js';
import { localDistanceKilometres } from '../lib/device-location.js';
import { buildPhotoCourse, portablePhotoCourseExport } from '../lib/photo-course.js';

test('explicit help requests route to the actual tool without a model request', () => {
  assert.equal(naruLocalHelp('직원에게 보여줄 문의 카드를 열어줘'), 'inquiry');
  assert.equal(naruLocalHelp('주차장과 입구를 미리 보고 싶어'), 'preview');
  assert.equal(naruLocalHelp('장애인 화장실 정보를 비교해줘'), 'compare');
  assert.equal(naruLocalHelp('어떤 것을 도와줄 수 있어?'), 'help');
  for (const message of ['엄마와 가요', '임산부예요', '아이가 있어요', '두 번째 장소 시간을 45분으로 바꿔줘', '일정 미리 보여줘', '문의 카드 열지 마', '입구 미리보기는 하지 말아줘']) assert.equal(naruLocalHelp(message), null);
  assert.equal(new Set(NARU_HELP.map(item => item.id)).size, NARU_HELP.length);
});
test('festival websites use supplied links and reject executable or credential URLs', () => {
  assert.equal(festivalWebsite('<a href="https://festival.example.org/event?a=1&amp;b=2">홈페이지</a>'), 'https://festival.example.org/event?a=1&b=2');
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', '//example.org', 'https://user:pass@example.org', 'https://localhost', 'https://127.0.0.1', '<script>hello</script>', null]) assert.equal(festivalWebsite(value), '');
  assert.deepEqual(festivalSources({ title: '어떤 축제' }), { websiteUrl: '', officialUrl: '' });
  assert.match(festivalSources({ cotId: 'wrong', cotid: 'abc-123' }).officialUrl, /cotid=abc-123$/);
});
test('local GPS calculation returns only a finite distance and does not mutate either coordinate', () => {
  const gps = Object.freeze({ latitude: 35.3, longitude: 128.7 });
  const destination = Object.freeze({ lat: 35.2, lng: 128.6 });
  const distance = localDistanceKilometres(gps, destination);
  assert.ok(distance > 10 && distance < 20);
  assert.equal(localDistanceKilometres(gps, {lat: 35.3, lng: 128.7}), 0);
  assert.equal(localDistanceKilometres({ latitude: NaN, longitude: 0 }, destination), null);
  assert.equal(localDistanceKilometres({ latitude: 92, longitude: 0 }, destination), null);
});
test('photo GPS can group visits locally but cannot seed external search regions or exports', () => {
  const course = buildPhotoCourse([{ takenAt: { date: '2026-09-13', minutes: 600 }, point: { lat: 34.8377, lng: 127.8925 } }]);
  assert.equal(course.days[0].stops[0].hasPoint, true);
  assert.equal(course.days[0].stops[0].region, '');
  assert.deepEqual(course.regions, []);
  const payload = JSON.stringify(portablePhotoCourseExport(course.days));
  assert.doesNotMatch(payload, /34\.8377|127\.8925|남해|latitude|longitude/);
});
