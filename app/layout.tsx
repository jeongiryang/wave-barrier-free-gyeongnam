import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/site-shell.css";
import "./styles/landing-explorer.css";
import "./styles/landing-route-data.css";
import "./styles/place-dialog.css";
import "./styles/landing-foundations.css";
import "./styles/planner-foundations.css";
import "./styles/regional-explorer-foundations.css";
import "./styles/theme-itinerary-foundations.css";
import "./styles/planner-workspace.css";
import "./styles/photo-course.css";
import "./styles/photo-course-page.css";
import "./styles/travel-book.css";
import "./styles/landing-motion.css";
import "./styles/workspace-responsive.css";
import "./styles/map-experience.css";
import "./styles/map-workspace.css";
import "./styles/map-place-tools.css";
import "./styles/map-live-signals.css";
import "./styles/situation-identity-refinements.css";
import "./styles/ocean-landing-refinements.css";
import "./styles/ocean-planner-refinements.css";
import "./styles/ocean-responsive-refinements.css";
import "./styles/design-system.css";
import "./styles/experience-accessibility.css";
import "./styles/account-auth.css";
import "./styles/community.css";
import "./styles/account-community.css";
import "./styles/landing-stories.css";
import "./styles/landing-expansion.css";
import "./styles/landing-journey-stage.css";
import "./styles/landing-feature-motion.css";
import "./styles/landing-regions.css";
import "./styles/landing-arrival.css";
import "./styles/planner-unified-workspace.css";
import "./styles/planner-journey-control.css";
import "./styles/planner-flow.css";
import "./styles/planner-service-status.css";
import "./styles/planner-theme-contrast.css";
import "./styles/departure-readiness.css";
import "./styles/preferences.css";
import "./styles/mobile-interaction-hardening.css";
import "./styles/policies.css";
import { SitePreferencesProvider } from "../components/SitePreferences";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE, SOCIAL_IMAGE } from "../lib/site-metadata";
import { arrivalBootstrap } from "../features/landing/arrival-bootstrap";

const productionUrl = new URL(SITE_ORIGIN);
const preferenceBootScript = `(()=>{try{const d=document.documentElement;const m=matchMedia('(prefers-color-scheme: dark)').matches;const r=matchMedia('(prefers-reduced-motion: reduce)').matches;const t=localStorage.getItem('wave-theme');const o=localStorage.getItem('wave-motion');d.dataset.theme=t==='dark'||t==='light'?t:(m?'dark':'light');d.dataset.motion=r||o==='calm'?'calm':'full';d.lang='ko';d.style.colorScheme=d.dataset.theme}catch{}try{document.documentElement.dataset.introSeen=sessionStorage.getItem('wave-arrival-session-v1')==='done'?'1':'0'}catch{}})()`;

export const metadata: Metadata = {
  metadataBase: productionUrl,
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: "%s | W.A.V.E",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  category: "travel",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: productionUrl,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE, width: 1348, height: 926, alt: "W.A.V.E 경남 무장애 여행 서비스 화면" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Keep browser UI assets on this deployment, independently of SEO's canonical metadataBase. */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <script dangerouslySetInnerHTML={{ __html: preferenceBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: arrivalBootstrap }} />
      </head>
      <body className="antialiased">
        <SitePreferencesProvider>{children}</SitePreferencesProvider>
      </body>
    </html>
  );
}
