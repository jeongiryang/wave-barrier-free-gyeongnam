import SharedTripScreen from "../../../features/trips/components/SharedTripScreen";
import { pageMetadata } from "../../../lib/site-metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return pageMetadata({
    title: "공유한 경남 여행 계획",
    description: "W.A.V.E에서 공유한 여행 조건, 공식 장소와 일정 순서를 확인합니다.",
    path: `/trip/${encodeURIComponent(id)}`,
    index: false,
  });
}

export default function SharedTripPage() {
  return <SharedTripScreen />;
}
