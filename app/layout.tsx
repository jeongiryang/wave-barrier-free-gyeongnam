import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/account-community.css";
import "./styles/landing-stories.css";
import "./styles/preferences.css";
import { SitePreferencesProvider } from "../components/SitePreferences";

const productionUrl = new URL("https://wave-barrier-free-gyeongnam.vercel.app");

export const metadata: Metadata = {
  metadataBase: productionUrl,
  applicationName: "W.A.V.E",
  title: {
    default: "W.A.V.E 여행 동행 안전 플랫폼",
    template: "%s | W.A.V.E",
  },
  description: "누구나 편안하게 떠나는 경상남도 무장애 맞춤 여행 길잡이",
  alternates: { canonical: "/" },
  category: "travel",
  creator: "W.A.V.E",
  publisher: "W.A.V.E",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: productionUrl,
    siteName: "W.A.V.E",
    title: "W.A.V.E 여행 동행 안전 플랫폼",
    description: "경남 18개 시·군의 관광·무장애·교통 데이터를 연결해 장소 선택부터 이동과 일정까지 설계합니다.",
  },
  twitter: {
    card: "summary",
    title: "W.A.V.E 여행 동행 안전 플랫폼",
    description: "경남 18개 시·군의 데이터 기반 무장애 맞춤 여행 길잡이",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  verification: {
    google: "M6Cy6rSLQKYJ5i-toLK3hQyoFOoZlMyvnZa-_W6dioo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#062736" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <SitePreferencesProvider>{children}</SitePreferencesProvider>
      </body>
    </html>
  );
}
