import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../features/festivals/FestivalAmenities.tsx', import.meta.url), 'utf8');

test('festival amenity demo restores both map layers and marks every location as synthetic', () => {
  assert.match(source, /data-amenity-marker/);
  assert.match(source, />쉬는 곳</);
  assert.match(source, />화장실</);
  assert.match(source, /\[시연용 임의 위치\]/);
  assert.match(source, /실제 시설 위치가 아닙니다/);
  assert.doesNotMatch(source, /시연 · 임의 위치|시연용 예시 지도|예시 데이터로 체험/);
  assert.match(source, /\[시연\] \{place.name\} 현장 편의 지도/);
  assert.match(source, /축제 주최 측의 공식 현장 지도/);
});
