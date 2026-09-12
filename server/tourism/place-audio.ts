import { clean, json, httpsUrl } from '../shared/http';
import type { Env } from '../shared/env';
import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { matchingAudioStories } from '../../lib/odii-evidence.js';

export async function handlePlaceAudio(request: Request, env: Env) {
  const id = new URL(request.url).searchParams.get('contentId') || '';
  if (!/^[1-9]\d{0,11}$/.test(id)) return json({ error: '장소를 확인해 주세요.' }, 400);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(11000)]);
  const detail = await attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId: id }, signal));
  if (!detail.ok) return json({ error: '장소 정보를 받지 못했어요. 다시 확인해 주세요.' }, 502);
  const venue = detail.value.items.find(item => clean(item.contentid) === id && clean(item.lDongRegnCd) === '48');
  if (!venue) return json({ error: '이 경남 장소의 정보를 확인하지 못했어요.' }, 404);
  const place = { name: clean(venue.title, 120), mapX: venue.mapx, mapY: venue.mapy };
  const response = await attemptProvider(fetchTourismData(env, 'Odii', 'storySearchList', { ...commonParams('20'), langCode: 'ko', keyword: place.name }, signal));
  if (!response.ok) return json({ error: '오디 해설 제공처에 연결하지 못했어요. 잠시 뒤 다시 확인해 주세요.' }, 502);
  const stories = matchingAudioStories(response.value.items, place).map(item => ({
    id: clean(item.stid || item.stlid, 40), title: clean(item.title), audioTitle: clean(item.audioTitle || item.title),
    audioUrl: httpsUrl(item.audioUrl), script: clean(item.script, 10000), playTime: clean(item.playTime),
  }));
  return json({ placeId: id, placeName: place.name, stories, state: stories.length ? 'available' : 'empty', source: '한국관광공사 Odii', checkedAt: new Date().toISOString() }, 200, true);
}
