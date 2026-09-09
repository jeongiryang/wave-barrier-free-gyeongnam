"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingExpansionScene from "./LandingExpansionScene";
import LandingScreenCapture from "./LandingScreenCapture";

export default function LandingPossibilityScene() {
  const en = useSitePreferences().locale === "en";
  return <section className="recommendation-chapter" aria-labelledby="recommendation-title">
    <LandingExpansionScene />
    <div className="destination-editorial" data-cinematic="left">
      <div className="destination-copy">
        <p className="section-kicker">{en ? "Places that fit your plans" : "내 조건에서 만나는 여행지"}</p>
        <h2 id="recommendation-title">{en ? "A place to fall for." : "마음에 드는 풍경,"}<br /><em>{en ? "The details to decide." : "나에게 맞는 이유."}</em></h2>
        <p>{en ? "Compare the places you like with the facilities you need. Missing information stays unconfirmed." : "가고 싶은 곳의 사진과 편의정보를 함께 살펴보세요. 확인되지 않은 편의는 미확인으로 구분해요."}</p>
        <dl className="destination-evidence" data-place-evidence="2758443">
          <div><dt>{en ? "Recorded" : "대산플라워랜드 · 확인"}</dt><dd>{en ? "Access path · toilet" : "완만한 접근로 · 화장실"}</dd></div>
          <div><dt>{en ? "Unconfirmed" : "미확인"}</dt><dd>{en ? "Lift · ask the venue" : "승강기 · 방문 전 시설에 문의"}</dd></div>
        </dl>
      </div>
      <figure className="destination-product">
        <LandingScreenCapture name="places-two" width={833} height={546} alt="주남저수지와 대산플라워랜드의 실제 관광사진과 편의정보. 한국관광공사 사진 워터마크 유지." />
        <figcaption>{en ? "Photos and facility records: ⓒKorea Tourism Organization" : "사진·편의정보 출처: ⓒ한국관광공사"}</figcaption>
      </figure>
    </div>
  </section>;
}
