import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("비밀번호 복구는 계정 존재 여부를 노출하지 않고 일회용 토큰을 요구한다", async () => {
  const [requestForm, resetForm, loginForm] = await Promise.all([
    source("features/auth/components/ForgotPasswordForm.tsx"),
    source("features/auth/components/ResetPasswordForm.tsx"),
    source("features/auth/components/AuthForm.tsx"),
  ]);
  assert.match(requestForm, /authClient\.requestPasswordReset/);
  assert.match(requestForm, /입력한 주소가 등록된 계정이면/);
  assert.doesNotMatch(requestForm, /계정이 없습니다|등록되지 않은/);
  assert.match(requestForm, /redirectTo: `\$\{window\.location\.origin\}\/reset-password`/);
  assert.match(resetForm, /authClient\.resetPassword\(\{ newPassword, token \}\)/);
  assert.match(resetForm, /useSearchParams/);
  assert.match(resetForm, /!token/);
  assert.match(loginForm, /href="\/forgot-password"/);
});

test("계정 탈퇴는 본인 재확인과 일회용 정리 권한 뒤 모든 연결 데이터를 삭제한다", async () => {
  const [route, completionRoute, repository, migration, settings, completionPage, completionClient] = await Promise.all([
    source("app/api/account/route.ts"),
    source("app/api/account/complete-deletion/route.ts"),
    source("features/community/server/account-repository.ts"),
    source("migrations/007_account_deletion.sql"),
    source("features/auth/components/AccountSettings.tsx"),
    source("app/account/delete-complete/page.tsx"),
    source("features/auth/components/AccountDeletionComplete.tsx"),
  ]);
  assert.match(route, /readSameOriginJson\(request, 2_048\)/);
  assert.match(route, /confirmation !== "계정 삭제"/);
  assert.match(route, /auth\.deleteUser\(\{ password, callbackURL \}\)/);
  assert.match(route, /Verification email sent/);
  assert.match(route, /cleanupPending: true, cleanupToken: prepared\.token/);
  assert.match(route, /인증 계정은 이미 삭제됐다/);
  assert.match(completionRoute, /readSameOriginJson\(request, 1_024\)/);
  assert.match(repository, /crypto\.getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(repository, /crypto\.subtle\.digest\("SHA-256"/);
  assert.doesNotMatch(repository, /INSERT INTO account_deletion_grants[^\n]*token\}/);
  for (const table of ["community_reports", "community_likes", "community_comments", "community_posts", "account_deletion_grants"]) {
    assert.match(repository, new RegExp(`DELETE FROM ${table}`));
  }
  assert.match(repository, /sql\.transaction\(\[/);
  assert.match(migration, /token_hash CHAR\(64\) PRIMARY KEY/);
  assert.match(migration, /user_id TEXT NOT NULL UNIQUE/);
  assert.match(settings, /이 기기에만 저장된 여행집과 환경설정은 남습니다/);
  assert.match(settings, /account\/delete-complete\?token=/);
  assert.match(completionPage, /referrer: "no-referrer"/);
  assert.match(completionClient, /useSearchParams/);
});

test("계정 메뉴와 정책은 구현된 복구·관리·데이터 삭제 범위를 안내한다", async () => {
  const [menu, privacy, terms, retention, productionCheck] = await Promise.all([
    source("features/auth/components/AccountMenu.tsx"),
    source("app/privacy/page.tsx"),
    source("app/terms/page.tsx"),
    source("server/trips/retention-handler.ts"),
    source("scripts/check-production-apis.mjs"),
  ]);
  assert.match(menu, /href="\/account"/);
  assert.match(privacy, /계정 관리에서 탈퇴하면/);
  assert.match(terms, /등록 이메일을 통한 비밀번호 재설정/);
  assert.match(retention, /sweepExpiredAccountDeletionGrants/);
  for (const path of ["/forgot-password", "/reset-password", "/account", "/account/delete-complete"]) {
    assert.match(productionCheck, new RegExp(path.replaceAll("/", "\\/")));
  }
});
