"use client";
import Link from "next/link";
import { NARU_HELP } from "../../../lib/naru-help.js";
import { useOpenNaru } from "../../../components/GlobalTravelWorkspace";
import NaruAvatar from "../../../components/NaruAvatar";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingAssistantStory() {
  const openNaru = useOpenNaru();
  const en = useSitePreferences().locale === "en";
  return <section id="naru" className="simple-naru-story simple-section" aria-labelledby="landing-naru-title" tabIndex={-1}>
    <div data-land-reveal><h2 id="landing-naru-title">{en ? "Plan with Naru" : "나루에게 말해보세요"}</h2>
      <p>{en ? "Our AI travel guide finds places and helps edit your itinerary. Type or use your microphone." : "AI 여행 가이드 나루가 여행지를 찾고 일정을 정리하며 글이나 마이크로 이야기할 수 있어요"}</p>
      <Link className="simple-text-link" href="/planner?assistant=naru">{en ? "Chat with Naru" : "나루와 대화하기"} <span aria-hidden="true">→</span></Link>
      <div lang="ko" className="landing-naru-usecases">{NARU_HELP.slice(0, 6).map(item => <button type="button" key={item.id} onClick={() => openNaru(item.example)}>{item.title}<span aria-hidden="true"> →</span></button>)}</div><Link lang="ko" className="simple-text-link" href="/guide#naru-guide">나루 사용 방법 →</Link>
    </div>
    <div className="simple-naru-example" aria-label={en ? "Example conversation" : "대화 예시"}>
      <div className="simple-naru-example-title"><NaruAvatar state="idle" /><strong>나루</strong><small>{en ? "Example" : "대화 예시"}</small></div>
      <p className="example-user">{en ? "Make my first visit 90 minutes." : "첫 번째 장소에서 90분 머물게 해줘"}</p>
      <p>{en ? "Changed the first visit to 90 minutes and updated the following times." : "첫 번째 장소의 체류 시간을 90분으로 바꾸고 다음 장소의 시간도 함께 조정했어요"}</p>
      <span className="example-undo">{en ? "Undo" : "되돌리기"}</span>
    </div>
  </section>;
}
