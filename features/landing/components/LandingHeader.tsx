import WaveHeader from "../../../components/WaveHeader";
import type { LandingTranslate } from "../content";

export default function LandingHeader({ scrolled }: { scrolled: boolean; t: LandingTranslate }) {
  return <WaveHeader current="intro" className={scrolled ? "scrolled" : ""} />;
}
