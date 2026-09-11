import SkipLink from "../../../components/SkipLink";
import type { AuthMode } from "../types";
import AuthForm from "./AuthForm";
import { isKakaoAuthConfigured } from "../../../lib/auth/server";

export default function AuthShell({ mode, returnTo }: { mode: AuthMode; returnTo?: string }) {
  return <main className="auth-page auth-focused">
    <SkipLink href="#auth-title">계정 입력으로 바로가기</SkipLink>
    <div className="auth-layout"><AuthForm mode={mode} returnTo={returnTo} kakaoEnabled={isKakaoAuthConfigured()} /></div>
  </main>;
}
