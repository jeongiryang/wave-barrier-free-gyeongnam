import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingHeroCopy from "./LandingHeroCopy";

export default function LandingHero() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero landing-hero-split" id="top" tabIndex={-1} aria-labelledby="landing-title">
    <div className="landing-hero-copy">
      <LandingHeroCopy />
      <p className="landing-hero-description">{en ? "Fewer barriers. More places to discover. Explore Gyeongnam with WAVE." : <>장벽은 낮게, 더 많은 여행이 가능하게.<br/>경남의 새로운 여행을 경험하세요.</>}</p>
      <form className="night-hero-search" action="/planner"><label className="sr-only" htmlFor="landing-region">{en ? 'Choose your destination' : '어디로 떠나고 싶으세요?'}</label><select id="landing-region" name="region" defaultValue=""><option value="" disabled>{en ? 'Where would you like to go?' : '어디로 떠나고 싶으세요?'}</option>{['통영','거제','남해','진주','창원','하동','산청','경남 전체'].map(name=><option key={name}>{name}</option>)}</select><button type="submit" aria-label={en ? 'Find places' : '여행지 검색'}>→</button></form>
      <div className="landing-actions"><Link href="/planner">{en ? "Explore places" : "여행지 둘러보기"}<span aria-hidden="true">→</span></Link></div>
    </div>
    <span className="night-hero-signature" aria-hidden="true">Travel<br/>Without Barriers</span>
    <figure className="landing-hero-landscape"><img src="/media/night/coast.webp" alt="" fetchPriority="high" /></figure>
  </section>;
}
