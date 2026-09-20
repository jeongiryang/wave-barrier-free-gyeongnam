import type { Metadata } from "next";

export const SITE_ORIGIN = "https://wave-barrier-free-gyeongnam.vercel.app";
export const SITE_NAME = "WAVE";
export const SITE_TITLE = "WAVE 경남 무장애 여행 길잡이";
export const SITE_DESCRIPTION = "공공데이터로 확인된 경남 여행 편의 정보를 보여 주고, 확인되지 않은 것은 확인되지 않았다고 알려 줍니다.";
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
      images: [{ url: SOCIAL_IMAGE, width: 1348, height: 926, alt: "WAVE 경남 무장애 여행 서비스 화면" }],
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
