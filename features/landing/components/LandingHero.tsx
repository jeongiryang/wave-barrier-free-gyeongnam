import WaveSelect from "../../../components/WaveSelect";
import NightIcon from "../../../components/NightIcon";
import { regions } from "../../planner/constants";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingHeroCopy from "./LandingHeroCopy";

export default function LandingHero() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero landing-hero-split" id="top" tabIndex={-1} aria-labelledby="landing-title">
    <div className="landing-hero-copy">
      <LandingHeroCopy />
      <p className="landing-hero-description">{en ? "Fewer barriers. More places to discover. Explore Gyeongnam with WAVE." : <>장벽은 낮게, 더 많은 여행이 가능하게.<br/>경남의 새로운 여행을 경험하세요.</>}</p>
      <form className="night-hero-search" action="/planner"><label className="sr-only" htmlFor="landing-region">{en ? 'Choose your destination' : '어디로 떠나고 싶으세요?'}</label><WaveSelect id="landing-region" name="region" defaultValue=""><option value="" disabled>{en ? 'Where would you like to go?' : '어디로 떠나고 싶으세요?'}</option>{regions.map(name=><option key={name}>{name}</option>)}</WaveSelect><button type="submit" aria-label={en ? 'Find places' : '여행지 검색'} title={en ? "Search" : "검색"}><NightIcon name="search"/></button></form>
    </div>
  </section>;
}
