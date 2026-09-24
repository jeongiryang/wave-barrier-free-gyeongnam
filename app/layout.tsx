import GlobalTravelWorkspace from "../components/GlobalTravelWorkspace";
import WaveFooterTools from "../components/WaveFooterTools";
import type { Metadata, Viewport } from "next";
import "./styles/wave-fonts.css";
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
// #353 removed these scenes; preserve their source styles without shipping them.
import "./styles/landing-region-active.css";
import "./styles/landing-cinematic.css";
import "./styles/planner-unified-workspace.css";
import "./styles/planner-journey-control.css";
import "./styles/planner-flow.css";
import "./styles/planner-service-status.css";
import "./styles/planner-theme-contrast.css";
import "./styles/departure-readiness.css";
import "./styles/preferences.css";
import "./styles/mobile-interaction-hardening.css";
import "./styles/policies.css";
import "./styles/wave-horizon.css";
import "./styles/place-decisions.css";
import "./styles/planner-conversation.css";
import "./styles/landing-split.css";
import "./styles/simple-wave.css";
import "./styles/simple-planner.css";
import "./styles/wave-refinements.css";
import "./styles/night-desktop.css";
import "./styles/night-secondary.css";
import "./styles/night-regression.css";
import "./styles/naru-workspace.css";
import "./styles/immersive-workspace.css";
import "./styles/mobile-design-b.css";
import "./styles/wave-ui-refresh.css";
import "./styles/submission-refinements.css";
import { SitePreferencesProvider } from "../components/SitePreferences";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE, SOCIAL_IMAGE } from "../lib/site-metadata";

const productionUrl = new URL(SITE_ORIGIN);
// Inline head paint protects the first frame before route CSS and React load.
// Without JavaScript no pending marker is set, so ordinary content stays usable.
const arrivalBootStyle = `#arrival-boot{display:none}html[data-intro-pending]{overflow:hidden}html[data-intro-pending] #arrival-boot{display:grid;position:fixed;inset:0;z-index:2147483647;place-content:center;background:#020817;color:#fff;font:700 32px system-ui}html[data-intro-pending] body>*:not(#arrival-boot){visibility:hidden}#arrival-boot button{position:absolute;top:16px;right:16px;min-height:44px;padding:8px 14px;border:1px solid #6385a1;border-radius:999px;background:#091627;color:#fff;font:16px system-ui}#arrival-boot button:focus-visible{outline:3px solid #8de8ff;outline-offset:3px}`;
const arrivalBootScript = `(()=>{const d=document.documentElement,m=matchMedia('(prefers-reduced-motion: reduce)');if(location.pathname!=='/'||location.hash||d.dataset.introSeen==='1'||m.matches)return;d.dataset.introPending='1';const clear=()=>{delete d.dataset.introPending;clearTimeout(timer);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true);m.removeEventListener('change',reduce);window.removeEventListener('wave-arrival-ready',clear)};const dismiss=()=>{d.dataset.introSeen='1';try{sessionStorage.setItem('wave-arrival-session-v1','done')}catch{}clear()};const click=e=>{if(e.target instanceof Element&&e.target.closest('#arrival-boot button'))dismiss()};const key=e=>{if(e.key==='Escape'){e.preventDefault();dismiss()}};const reduce=()=>{if(m.matches)dismiss()};const timer=setTimeout(dismiss,8000);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);m.addEventListener('change',reduce);window.addEventListener('wave-arrival-ready',clear)})()`;
const preferenceBootScript = `(()=>{try{const d=document.documentElement;const e=${process.env.NODE_ENV === "development" ? "localStorage.getItem('wave-dev-presentation')==='enabled'" : "false"};const m=matchMedia('(prefers-color-scheme: dark)').matches;const r=matchMedia('(prefers-reduced-motion: reduce)').matches;const t=localStorage.getItem('wave-theme');d.dataset.theme=e?(t==='dark'||t==='light'?t:(m?'dark':'light')):'light';d.dataset.motion=r?'calm':'full';const s=localStorage.getItem('wave-text-scale-v1');d.dataset.textScale=s==='large'||s==='larger'?s:'standard';d.dataset.colorAssist=localStorage.getItem('wave-color-assist-v1')==='on'?'on':'off';d.dataset.tone=e&&localStorage.getItem('wave-tone-v1')==='gyeongnam'?'gyeongnam':'standard';d.lang='ko';d.style.colorScheme=d.dataset.theme}catch{}try{document.documentElement.dataset.introSeen=sessionStorage.getItem('wave-arrival-session-v1')==='done'?'1':'0'}catch{}})()`;

export const metadata: Metadata = {
  metadataBase: productionUrl,
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: "%s | WAVE",
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
    images: [{ url: SOCIAL_IMAGE, width: 1348, height: 926, alt: "WAVE 경남 무장애 여행 서비스 화면" }],
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
        <style>{`html,html body{background-color:#020d19}${arrivalBootStyle}`}</style>
        <script dangerouslySetInnerHTML={{ __html: arrivalBootScript }} />
      </head>
      <body className="antialiased">
        <div id="arrival-boot"><p>WAVE</p><button type="button">건너뛰기</button></div>
        <noscript><style>{".arrival-intro{display:none!important}"}</style><p>WAVE 여행 설계를 이용하려면 브라우저에서 JavaScript를 허용해 주세요.</p></noscript>
        <SitePreferencesProvider><GlobalTravelWorkspace>{children}</GlobalTravelWorkspace><WaveFooterTools /></SitePreferencesProvider>
      </body>
    </html>
  );
}
