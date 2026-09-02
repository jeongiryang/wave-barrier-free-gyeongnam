import type { Metadata } from "next";

export const SITE_ORIGIN = "https://wave-barrier-free-gyeongnam.vercel.app";
export const SITE_NAME = "W.A.V.E";
export const SITE_TITLE = "W.A.V.E 경남 무장애 여행 길잡이";
export const SITE_DESCRIPTION = "경남 18개 시·군의 관광·무장애·교통 근거를 연결해 장소 선택부터 실제 경로, 일정과 출발 준비까지 돕습니다.";
export const SOCIAL_IMAGE = "https://raw.githubusercontent.com/jeongiryang/wave-barrier-free-gyeongnam/main/docs/screenshots/wave-landing-desktop.jpg";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
};

export function pageMetadata({ title, description, path, index = true }: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: path,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [{ url: SOCIAL_IMAGE, width: 1348, height: 926, alt: "W.A.V.E 경남 무장애 여행 서비스 화면" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [SOCIAL_IMAGE],
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true },
  };
}
