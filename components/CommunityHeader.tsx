import WaveHeader from "./WaveHeader";

export default function CommunityHeader({ current = "community" }: { current?: "community" | "planner" | "travel-book" }) {
  return <WaveHeader current={current} />;
}
