"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
import { useStoryPlayback } from "../hooks/useStoryPlayback";
export const heroPhrases = [
  ["가고 싶은 곳으로.", "우리의 속도로."],
  ["필요한 시설을 살펴보고,", "내게 맞는 여행지를 찾아보세요."],
  ["가고 싶은 경남,", "나에게 맞는 방법으로."],
] as const;
const englishPhrases = [["Go where you want.", "At your own pace."], ["Explore the facilities.", "Find the places that fit you."], ["Gyeongnam awaits.", "Travel your own way."]] as const;
export default function LandingHeroCopy() {
  const en = useSitePreferences().locale === "en";
  const { root, index: step, running, still } = useStoryPlayback(heroPhrases.length + 1, 6500, true);
  const phrases = en ? englishPhrases : heroPhrases;
  return <div ref={root} className="hero-copy-sequence" data-phrase={step} data-running={running} data-still={still}>
    <h1 id="landing-title" tabIndex={-1}>
      <span className="sr-only">{phrases[0].join(" ")}</span>
      <span className="hero-title-copies" aria-hidden="true">{phrases.map((phrase, index) => <span className="hero-phrase" key={index} data-active={step === index}>{phrase.map((line, part) => <span className="hero-line" key={part}><span>{part ? <em>{line}</em> : line}</span></span>)}</span>)}</span>
    </h1>
  </div>;
}
