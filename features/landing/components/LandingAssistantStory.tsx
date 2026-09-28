"use client";
import { usePreviewReady } from "./usePreviewPlayback";
import Link from "next/link";

import { NARU_HELP } from "../../../lib/naru-help.js";
import { useOpenNaru } from "../../../components/NaruContext";
import NaruAvatar from "../../../components/NaruAvatar";
import NightIcon from "../../../components/NightIcon";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingAssistantStory() {
  const ready = usePreviewReady();
  const openNaru = useOpenNaru();

  const en = useSitePreferences().locale === "en";
  return <section id="naru" className="simple-naru-story simple-section" aria-labelledby="landing-naru-title" tabIndex={-1}>
    <div data-land-reveal><h2 id="landing-naru-title">{en ? "Plan with Naru" : "나루에게 말해보세요"}</h2>
      <p>{en ? "Our AI travel guide finds places and helps edit your itinerary. Type or use your microphone." : "나루가 당신에게 맞는 경남 여행을 함께 찾고 일정을 정리해요"}</p>
      <div lang="ko" className="landing-naru-usecases">{NARU_HELP.slice(0, 6).map((item, index) => <button type="button" disabled={!ready} key={item.id} onClick={() => openNaru(item.example)}><NightIcon name={["chat", "list", "access", "walk", "heart", "undo"][index]} size={20}/><span>{item.title}</span><NightIcon name="right" size={16}/></button>)}</div><Link lang="ko" className="simple-text-link" href="/guide#naru-guide">나루 사용 방법</Link>
    </div>
    <div className="simple-naru-example" aria-label={en ? "Example conversation" : "대화 예시"}>
      <div className="simple-naru-example-title"><NaruAvatar large /><strong>나루</strong></div>
      <p className="example-user">{en ? "Make my first visit 90 minutes." : "첫 번째 장소에서 90분 머물게 해줘"}</p>
      <p>{en ? "Shall we change the visit from 60 to 90 minutes?" : "체류 시간을 60분에서 90분으로 바꿀까요?"}</p>
      <div className="example-duration"><span>{en ? "Visit duration" : "체류 시간"}</span><div><strong>60<small>{en ? " min" : "분"}</small></strong><span className="example-change-arrow" aria-hidden="true">→</span><strong className="example-proposed">90<small>{en ? " min" : "분"}</small></strong></div></div>
    </div>
  </section>;
}
