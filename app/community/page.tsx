import type { Metadata } from "next";
import CommunityBoard from "../../features/community/components/CommunityBoard";

export const metadata: Metadata = {
  title: "여행자 이야기",
  description: "경남 관광지의 접근성 질문과 실제 여행 경험을 공식 정보와 구분해 나누는 W.A.V.E 커뮤니티입니다.",
};

type CommunitySearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function CommunityPage({ searchParams }: { searchParams: CommunitySearchParams }) {
  const params = await searchParams;
  const id = single(params.placeId).slice(0, 100);
  const name = single(params.placeName).slice(0, 120);
  const region = single(params.region).slice(0, 20);
  const initialPlace = id && name ? { id, name, region } : null;

  return <CommunityBoard initialPlace={initialPlace} />;
}
