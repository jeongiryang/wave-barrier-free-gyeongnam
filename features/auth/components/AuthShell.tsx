import SkipLink from "../../../components/SkipLink";
import WaveHeader from "../../../components/WaveHeader";
import NightAccountVisual from "../../../components/NightAccountVisual";
import type { AuthMode } from "../types";
import AuthForm from "./AuthForm";
import { isKakaoAuthConfigured } from "../../../lib/auth/server";

export default function AuthShell({ mode, returnTo }: { mode: AuthMode; returnTo?: string }) {
  return <main className="auth-page auth-focused wave-night night-secondary">
    <SkipLink href="#auth-title">계정 입력으로 바로가기</SkipLink>
    <WaveHeader current="other" />
    <div className="auth-layout"><NightAccountVisual /><AuthForm mode={mode} returnTo={returnTo} kakaoEnabled={isKakaoAuthConfigured()} publicPreview={process.env.WAVE_PUBLIC_PREVIEW === '1'} /></div>
  </main>;
}
