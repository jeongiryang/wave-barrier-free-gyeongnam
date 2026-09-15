"use client";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import { horizonPhotos } from "../horizon-photos";
import EditorialPhoto from "./EditorialPhoto";

export default function LandingAccountStory() {
  const en = useSitePreferences().locale === "en";
  return <section id="recommendation" tabIndex={-1} className="horizon-account" aria-labelledby="account-story-title" data-cinematic="wide">
    <EditorialPhoto photo={horizonPhotos.park} className="horizon-account-photo" />
    <div className="horizon-account-copy" data-land-reveal>
      <p className="horizon-eyebrow">{en ? "YOUR JOURNEY, TOGETHER" : "함께 만드는 다음 장면"}</p>
      <h2 id="account-story-title">{en ? "Save the day." : "여행을 담고,"}<br /><em>{en ? "Share the anticipation." : "설렘을 나누고."}</em></h2>
      <p>{en ? "Continue your saved trip on another device. Invite your companions and decide where to go together." : "저장한 여행을 다른 기기에서도 이어가고, 동행자와 가고 싶은 곳을 함께 정해요."}</p>
      <ul className="horizon-account-benefits">
        <li><b>01</b><span>{en ? "Your trips and preferences" : "내 여행과 편의 조건 저장"}</span></li>
        <li><b>02</b><span>{en ? "KakaoTalk sharing and your own chat" : "카카오톡 공유와 나에게 보내기"}</span></li>
        <li><b>03</b><span>{en ? "Companion invitations, votes and comments" : "동행 초대·투표·댓글"}</span></li>
      </ul>
      <div className="horizon-account-links"><Link className="horizon-light-button" href="/my-trips">{en ? "My trips" : "내 여행 이어가기"} <span aria-hidden="true">↗</span></Link><Link className="horizon-text-link" href="/guide">{en ? "How to use WAVE" : "사용법 알아보기"}<span aria-hidden="true">→</span></Link></div>
    </div>
  </section>;
}
