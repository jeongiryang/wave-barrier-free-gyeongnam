import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SitePreferencesProvider } from "../components/SitePreferences";

export const metadata: Metadata = {
  title: "W.A.V.E 여행 동행 안전 플랫폼",
  description: "누구나 편안하게 떠나는 경상남도 무장애 맞춤 여행 길잡이",
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
