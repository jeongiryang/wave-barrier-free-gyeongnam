import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { sanitizeGuidancePreferences } from '../lib/guidance-preferences.js';
import { resolveFacilityKeys } from '../lib/facility-selection.js';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Naru is one persistent conversation with compact, large and mobile fullscreen layouts', async () => {
  const [assistant, page, css] = await Promise.all([source('features/planner/components/PlannerAssistant.tsx'), source('app/planner/page.tsx'), source('app/styles/planner-conversation.css')]);
  assert.match(assistant, /naru-\$\{size\}/);
  assert.match(assistant, /wave-naru-size-v1/);
  assert.match(assistant, /여행 설계에서 자세히 보기/);
  assert.doesNotMatch(assistant, /onToolHost|PlannerAssistantPlaceTools/);
  assert.doesNotMatch(page, /PlannerStagePortal|assistantHost/);
  assert.match(css, /\.naru-panel\.naru-compact[^}]*440px/);
  assert.match(css, /\.naru-panel\.naru-large[^}]*980px/);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*\.naru-panel\.naru-compact,\.naru-panel\.naru-large[^}]*height: 100dvh/);
});

test('first-use choices store only concrete facilities, comfort and interaction preferences', async () => {
  const assistant = await source('features/planner/components/PlannerAssistant.tsx');
  assert.match(assistant, /어떤 도움이 필요할까요/);
  assert.match(assistant, /setInput\(prompt\)/);
  assert.doesNotMatch(assistant, /context: \{[^}]*starterSelected/);
  assert.deepEqual(sanitizeGuidancePreferences({ briefAnswers: true, oneAtATime: true, textFirst: true, audioFirst: true, easyNarration: true, diagnosis: 'private' }), { briefAnswers: true, oneAtATime: true, textFirst: true, audioFirst: true, easyNarration: true });
  assert.deepEqual(resolveFacilityKeys({ facilityKeys: ['route', 'wheel', 'private'] }), ['route']);
});

test('operational fixes remain visible at their integration boundaries', async () => {
  const [weather, photo, comment, restore] = await Promise.all([source('server/weather/open-meteo.ts'), source('server/tourism/spot-photo.ts'), source('features/community/hooks/useCommunityCommentActions.ts'), source('features/photo-course/PhotoCourseRestore.tsx')]);
  assert.match(weather, /wind_speed_unit: "ms"/);
  assert.match(photo, /strict \|\| spotPhotoRegionMatches\(region/);
  assert.match(photo, /candidate\.titleScore >= 90 && candidate\.regionMatched/);
  assert.match(comment, /communityCommentDraftKey\(postId, userId\)/);
  assert.match(comment, /discardCommentDraft/);
  assert.match(restore, /사용 방법/);
  assert.match(restore, /원본 사진과 GPS는 기기 밖으로 보내지 않습니다/);
});
