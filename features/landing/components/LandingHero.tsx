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
      <p className="landing-hero-description">{en ? "We show accessibility information confirmed by public data and clearly label what has not been confirmed." : "공공데이터로 확인된 편의 정보를 함께 보여 줘요. 확인되지 않은 것은 확인되지 않았다고 알려 줘요."}</p>
      <div className="landing-actions"><Link href="/planner">{en ? "Start planning" : "여행 설계 시작하기"}<span aria-hidden="true">→</span></Link></div>
    </div>
    <EditorialPhoto photo={horizonPhotos.coast} className="landing-hero-landscape" priority />
  </section>;
}
