'use client';
import Link from 'next/link';
import EditorialPhoto from './EditorialPhoto';
import { horizonPhotos } from '../horizon-photos';
export default function LandingCommunityScene() {
  return <section lang="ko" id="community" className="restored-community simple-section" aria-labelledby="community-story-title">
    <div className="restored-community-photos"><EditorialPhoto photo={horizonPhotos.park} /><EditorialPhoto photo={horizonPhotos.garden} /></div>
    <div data-land-reveal><p className="horizon-eyebrow">우리 사이에 남는 여행</p><h2 id="community-story-title">당신이 남긴 장면이<br /><em>다음 여행의 시작.</em></h2><p>다녀온 경험과 궁금한 이야기를 나눠보세요. 함께 알아갈수록 여행은 더 가까워져요.</p><Link href="/community" className="simple-text-link">여행자의 이야기 <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
