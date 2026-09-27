"use client";
import LandingStoryDialogue from './LandingStoryDialogue';
import LandingFestivalPreview from './LandingFestivalPreview';
import HandwrittenText from "../../../components/HandwrittenText";
import Link from 'next/link';
import { regionShowcasePhotos } from '../region-showcase-photos';
import { useSitePreferences } from '../../../components/SitePreferences';
export default function LandingCommunityScene() {
 const en=useSitePreferences().locale==='en';
 return <><section id="community" className="night-discover-card" aria-labelledby="community-story-title" data-land-reveal>
  <div className="night-discover-copy"><LandingStoryDialogue>우리 여행 이야기도 들려주고 싶어!</LandingStoryDialogue><h2 id="community-story-title">{en?'Travel brings people together.':<>여행이<br/>사람을 연결합니다</>}</h2><p>{en?'Share your journey and find fellow travellers.':'경험을 나누고, 질문하고, 함께 떠나는 여행 커뮤니티'}</p><Link className="simple-text-link" href="/community">{en?'Visit the community':'커뮤니티 둘러보기'}</Link></div>
  <div className="night-discover-photos" lang="ko">{['거제','통영','하동'].map(name=><Link key={name} href="/community"><img src={regionShowcasePhotos[name].image} alt={name} loading="lazy" width="250" height="340"/><span>{name} 여행 이야기</span></Link>)}</div>
 </section>
 <section className="night-discover-card night-discover-festival" aria-labelledby="landing-festival-title" data-land-reveal>
  <div><div className="night-festival-preview-banner"><img src="/media/night/festival.webp" alt="" width="550" height="320" loading="lazy"/><span className="night-hero-signature"><HandwrittenText text={"경남의 밤,\n함께 즐겨요"} /></span></div><LandingFestivalPreview/></div>
  <div className="night-discover-copy"><LandingStoryDialogue speaker="naru">여행 날짜에 열리는 축제도 함께 찾아볼까?</LandingStoryDialogue><h2 id="landing-festival-title">{en?'Gyeongnam festivals':<>경남의 축제,<br/><em>더 특별한 순간들</em></>}</h2><p>{en?'Find a festival for your next trip.':'함께 즐기는 경남의 다채로운 축제'}</p><Link className="simple-text-link" href="/festivals">{en?'See dates and places':'개최 일정과 장소 확인하기'}</Link></div>

 </section></>;
}
