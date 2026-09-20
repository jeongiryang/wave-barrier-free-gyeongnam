"use client";
import Link from 'next/link';
import { regionShowcasePhotos } from '../region-showcase-photos';
import { useSitePreferences } from '../../../components/SitePreferences';
export default function LandingCommunityScene() {
 const en=useSitePreferences().locale==='en';
 return <><section id="community" className="night-discover-card" aria-labelledby="community-story-title" data-land-reveal><h2 id="community-story-title">{en?'Travel brings people together.':<>여행이<br/>사람을 연결합니다</>}</h2><p>{en?'Share your journey and find fellow travellers.':'경험을 나누고, 질문하고, 함께 떠나는 여행 커뮤니티'}</p><div className="night-discover-photos">{['거제','통영','하동'].map(name=><Link key={name} href="/community"><img src={regionShowcasePhotos[name].image} alt={name} loading="lazy" width="150" height="180"/><span>{name} 여행 이야기 →</span></Link>)}</div><Link className="simple-text-link" href="/community">{en?'Visit the community':'커뮤니티 둘러보기'} →</Link></section>
 <section className="night-discover-card night-discover-festival" aria-labelledby="landing-festival-title" data-land-reveal><h2 id="landing-festival-title">{en?'Gyeongnam festivals':<>경남의 축제,<br/><em>더 특별한 순간들</em></>}</h2><p>{en?'Find a festival for your next trip.':'함께 즐기는 경남의 다채로운 축제'}</p><Link href="/festivals"><img src="/media/night/festival.webp" alt="" width="550" height="320" loading="lazy"/><span>{en?'See dates and places':'개최 일정과 장소 확인하기'} →</span></Link></section></>;
}
