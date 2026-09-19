import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingHeroCopy from "./LandingHeroCopy";
import EditorialPhoto from "./EditorialPhoto";
import { horizonPhotos } from "../horizon-photos";

export default function LandingHero() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero landing-hero-split" id="top" tabIndex={-1} aria-labelledby="landing-title">
    <div className="landing-hero-copy">
      <LandingHeroCopy />
      <p className="landing-hero-description">{en ? "Check facilities and travel information, then share your itinerary." : "필요한 편의시설과 이동 정보를 확인하고 만든 일정을 공유할 수 있어요"}</p>
      <div className="landing-actions"><Link href="/planner">{en ? "Explore places" : "여행지 둘러보기"}<span aria-hidden="true">→</span></Link></div>
    </div>
    <EditorialPhoto photo={horizonPhotos.coast} className="landing-hero-landscape" priority />
  </section>;
}
