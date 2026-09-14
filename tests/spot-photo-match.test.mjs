import assert from 'node:assert/strict';
import test from 'node:test';
import { spotPhotoRegionMatches } from '../lib/spot-photo-match.js';

test('strict photo matching requires the requested Gyeongnam city in official evidence', () => {
  assert.equal(spotPhotoRegionMatches('통영', '이순신공원', '경상남도 통영시 멘데해안길'), true);
  assert.equal(spotPhotoRegionMatches('통영', '이순신공원', '전라남도 여수시 웅천동'), false);
  assert.equal(spotPhotoRegionMatches('통영', '이순신공원'), false);
  assert.equal(spotPhotoRegionMatches('고성', '강원특별자치도 고성군 관광지'), false);
  assert.equal(spotPhotoRegionMatches('고성', '경상남도 고성군 관광지'), true);
  assert.equal(spotPhotoRegionMatches('경남 전체', '경상남도 거제시 관광지'), true);
});
