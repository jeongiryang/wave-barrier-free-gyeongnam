"use client";
import Link from 'next/link';
import { useSitePreferences } from '../../../components/SitePreferences';

export default function LandingAssistantStory() {
  const en = useSitePreferences().locale === 'en';
  return <section id="naru" className="landing-naru" aria-labelledby="landing-naru-title" tabIndex={-1}>
    <div>
      <p className="horizon-eyebrow">WAVE AI GUIDE</p>
      <h2 id="landing-naru-title">{en ? <>Your words.<br />Your kind of trip.</> : <>여행의 시작을,<br /><em>나루와 이야기로.</em></>}</h2>
      <p>{en ? 'Tell Naru where you want to go and which facilities you need. Our AI guide helps you find places, arrange your itinerary, and review what to check before leaving.' : '가고 싶은 곳, 필요한 편의, 쉬어가고 싶은 마음까지. WAVE의 AI 여행 가이드 나루와 대화하며 여행지를 찾고 일정을 정리해 보세요.'}</p>
      <ul><li>{en ? 'Type or speak, at your own pace' : '글로도, 목소리로도 편하게'}</li><li>{en ? 'Review each change before applying it' : '바뀔 내용을 보고 직접 적용'}</li><li>{en ? 'Every planning tool, within the conversation' : '대화 안에서 모든 여행 도구 이용'}</li></ul>
      <Link href="/planner?assistant=naru" className="horizon-blue-button">{en ? 'Meet Naru' : '나루와 여행 시작하기'} <span aria-hidden="true">↗</span></Link>
    </div>
    <div className="landing-naru-conversation" aria-label={en ? 'Example conversation with Naru' : '나루 대화 예시'}>
      <header><span className="naru-avatar" aria-hidden="true">✦</span><div><strong>{en ? 'Naru from WAVE' : 'WAVE의 나루'}</strong><small>{en ? 'Your AI travel guide' : '나의 AI 여행 가이드'}</small></div></header>
      <p className="landing-naru-user">{en ? 'I want to see the sea in Tongyeong, with breaks along the way.' : '통영에서 바다를 보고 싶어요. 중간에 쉬면서 다니고 싶고요.'}</p>
      <p>{en ? 'Let’s plan a seaside trip in Tongyeong. Which facilities would make your trip more comfortable?' : '통영의 바다를 함께 찾아볼게요. 편안하게 다니려면 어떤 편의가 필요할까요?'}</p>
      <div className="landing-naru-example"><span>{en ? 'Tongyeong' : '통영'}</span><span>{en ? 'Nature & relaxation' : '자연·휴양'}</span><span>{en ? 'Rest breaks' : '중간중간 휴식'}</span></div>
      <small>{en ? 'Illustrative conversation. Facility availability is checked against the source information.' : '기능을 설명하기 위한 대화 예시입니다. 시설 이용 정보는 출처와 확인 상태를 함께 살펴봐요.'}</small>
    </div>
  </section>;
}
