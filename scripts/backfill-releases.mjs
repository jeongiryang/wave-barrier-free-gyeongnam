import { execFileSync } from "node:child_process";

const releases = [
  ["v0.1.0", 1, "000f6a088cc72b13f26b30aa81e4d404d4589583", "chore: 한국어 README 및 Vercel·Render CI/CD 구성"],
  ["v0.1.1", 3, "714eb2e800f69b4b15bb256a8d0aaab7ac7b223b", "docs: 공모전 운영 및 데이터 정책 정리"],
  ["v0.2.0", 6, "200ff5edaa3ee4c2089a360aa0227b4befe1a5ed", "feat: Vercel 운영 전환과 여행 설계 경험 강화"],
  ["v0.2.1", 7, "0c4b14488242ab99ead5330bcd27ca91ec1ce8b0", "chore: 생성 산출물과 Sites 잔여 경로 제거"],
  ["v0.2.2", 8, "e54caf74eef612057e655fb5434ee77330b9bb4c", "fix: 보안 취약 의존성 업데이트"],
  ["v0.2.3", 9, "b7f2fdf0171d777d12437c8345705e8033e548ef", "chore: GitHub Actions 이름을 CI와 CD로 정리"],
  ["v0.2.4", 10, "dae1d3edc3bfa20d3f10a3131d51507bc4282884", "chore: Google Search Console 소유권 확인 추가"],
  ["v0.2.5", 12, "9e3e1bab3e25050e10e1b601c072c57a142e9606", "fix: Safe Browsing 오탐 유발 계정 폼 제거"],
  ["v0.2.6", 13, "085dca229084409e9d9896931316ff0c40f5e57c", "fix: 운영 보안과 서비스 신뢰성 강화"],
  ["v0.2.7", 14, "0ae160e5717a791724ae3c248597b97904479ded", "chore: 작업 단위별 PR 규칙을 CLAUDE.md에 추가"],
  ["v0.2.8", 17, "b568bcc8e7801685f6288740646dba9e34cf1b45", "docs: PR별 AI 작업 로그 체계 추가"],
  ["v0.2.9", 16, "6be3e04aa5d3f4fe2bc03204ab2d180c66e40dc0", "fix: 타입 오류 9건 수정하고 CI에 타입 검사 추가"],
  ["v0.3.0", 15, "6ce1bbaaba8b297ef9311c9e981027573b6a4625", "feat: 파도 인트로와 Deep Ocean 디자인 시스템 도입"],
  ["v0.3.1", 18, "93498168b11a9d460a4c60c1f9b97288e1066fe0", "fix: 교통 제공기관 초기 상태를 실제 연결 정보로 표시"],
  ["v0.3.2", 19, "7558fb342fa109efcb3f4d9c49926ba733b17590", "chore: 최신 main 기준 PR 검토를 강제"],
  ["v0.3.3", 20, "dfbc31701d389ae69ba7f8cb3688d10f7922ff44", "chore: 자율 진행 규칙과 작업 사이클 추가"],
  ["v0.3.4", 22, "780671ec0a5dc10d6bc657cf2ffcf0bcfb81ba09", "chore: 이슈 자동 분류와 검토 규칙 추가"],
  ["v0.3.5", 23, "2a916e186e2cfaff0d60c821f290a56f4d414200", "fix: 추천 여행지 캐러셀 모바일 오버플로 수정"],
  ["v0.3.6", 24, "2ac1fad005868c37ba160dc9b041b3454d6c12d4", "fix: 파동 효과의 잔상과 눈 피로 완화"],
  ["v0.3.7", 25, "31434ae0fca83aec4775cd3e9cb90a4549e21eee", "fix: 환경설정 저장값이 새로고침에서 유지되도록 수정"],
  ["v0.4.0", 26, "99ae76ad3fdd5eaa69b0eef951581acf97f95d3a", "feat: 파동 효과를 끌 수 있는 접근성 설정 추가"],
  ["v0.5.0", 27, "16b7cdf14127f24632de6a7a30360e41ddb4356d", "feat: 섹션을 따라가는 인터랙티브 도움말 투어 추가"],
  ["v0.5.1", 28, "bf92e6c643bc2e56351eef833ca067b47853e020", "docs: 공모전 구현 부문과 지정과제 정합성 명시"],
  ["v0.5.2", 29, "839b7d9ef93dcbb870708c47c04c0570b4c0140b", "fix: 모바일 접근성과 작은 화면 레이아웃 보정"],
  ["v0.5.3", 30, "a768326236febfeeafd4cc10e1438f833adba273", "fix: 추천 여행지에 공식 관광사진 표시"],
  ["v0.5.4", 31, "5a0232b89f9fccd1aae91e7bf494a6a8b46bc5a8", "fix: 도움말 강조 영역과 화면 이동 안정화"],
  ["v0.5.5", 32, "25e5f6481850fed6506a2d1aaaf148ae51bc63c0", "fix: 지도 전체보기 버튼 잘림 방지"],
  ["v0.6.0", 33, "f3c19fa0a9c004b6692823ec08b215593072921b", "feat: 여행 조건 변경 시 코스 자동 갱신"],
  ["v0.6.1", 34, "db6a5fccf8163fa73543323423f36ce4bde66a4a", "fix: 남해·산청 관광사진 대체 조회 추가"],
  ["v0.7.0", 35, "9656426115d6f46f70bc8d44615f50e22423f960", "feat: 데스크톱 화면 폭을 활용하는 유동형 레이아웃 적용"],
  ["v0.7.1", 36, "81228cca8cc4a66f22658dc3d1a6df1ec66b61c7", "chore: PR별 시맨틱 버전 태그와 릴리즈 백필"],
  ["v0.7.2", 37, "$CURRENT", "fix: 릴리즈 백필 권한 오류 수정"],
].map(([version, pr, sha, title]) => ({ version, pr, sha, title }));

function versionParts(value) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) throw new Error(`유효하지 않은 SemVer: ${value}`);
  return match.slice(1).map(Number);
}

function validateManifest(currentSha = process.env.GITHUB_SHA || "HEAD") {
  const versions = new Set();
  const prs = new Set();
  for (let index = 0; index < releases.length; index += 1) {
    const release = releases[index];
    if (versions.has(release.version)) throw new Error(`중복 버전: ${release.version}`);
    if (prs.has(release.pr)) throw new Error(`중복 PR: #${release.pr}`);
    versions.add(release.version);
    prs.add(release.pr);

    const [major, minor, patch] = versionParts(release.version);
    if (major !== 0) throw new Error(`1.0 이전 이력은 major 0이어야 합니다: ${release.version}`);
    if (index === 0) {
      if (minor !== 1 || patch !== 0) throw new Error("첫 릴리즈는 v0.1.0이어야 합니다.");
    } else {
      const [previousMajor, previousMinor, previousPatch] = versionParts(releases[index - 1].version);
      const feature = release.title.startsWith("feat:");
      const valid = feature
        ? major === previousMajor && minor === previousMinor + 1 && patch === 0
        : major === previousMajor && minor === previousMinor && patch === previousPatch + 1;
      if (!valid) throw new Error(`${release.version}이 ${releases[index - 1].version} 다음 규칙과 맞지 않습니다.`);
    }

    const target = release.sha === "$CURRENT" ? currentSha : release.sha;
    execFileSync("git", ["cat-file", "-e", `${target}^{commit}`], { stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", target, currentSha], { stdio: "ignore" });
  }
  console.log(`검증 완료: ${releases.length}개 PR 릴리즈 (${releases[0].version} → ${releases.at(-1).version})`);
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (response.status === 404 && options.allowMissing) return null;
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function backfill() {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY || !process.env.GITHUB_SHA) {
    throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA가 필요합니다.");
  }
  validateManifest(process.env.GITHUB_SHA);

  for (const release of releases) {
    const target = release.sha === "$CURRENT" ? process.env.GITHUB_SHA : release.sha;
    const existingRef = await github(`/git/ref/tags/${encodeURIComponent(release.version)}`, { allowMissing: true });
    if (existingRef && existingRef.object.sha !== target) {
      throw new Error(`${release.version} 태그가 다른 커밋 ${existingRef.object.sha}을 가리킵니다.`);
    }
    const existingRelease = await github(`/releases/tags/${encodeURIComponent(release.version)}`, { allowMissing: true });
    if (!existingRelease) {
      await github("/releases", {
        method: "POST",
        body: JSON.stringify({
          tag_name: release.version,
          target_commitish: target,
          name: `${release.version} · ${release.title.replace(/^[^:]+:\s*/, "")}`,
          body: [
            "## 포함 변경",
            "",
            `- PR: [#${release.pr}](https://github.com/${process.env.GITHUB_REPOSITORY}/pull/${release.pr})`,
            `- 변경: ${release.title}`,
            `- 기준 커밋: \`${target}\``,
            "",
            "이 릴리즈는 병합된 PR 한 건을 기준으로 생성한 시맨틱 버전 이력입니다.",
          ].join("\n"),
          draft: false,
          prerelease: false,
          make_latest: release.version === releases.at(-1).version ? "true" : "false",
        }),
      });
      console.log(`태그·릴리즈 생성: ${release.version} → ${target.slice(0, 7)}`);
    }

    // Release API가 target_commitish에 태그를 함께 만들게 한다. Actions의
    // GITHUB_TOKEN은 refs API를 연속 호출할 때 403이 날 수 있지만, 릴리즈
    // 생성 권한은 정상적으로 허용된다. 생성 후 실제 태그 SHA를 다시 검증한다.
    const createdRef = existingRef || await github(`/git/ref/tags/${encodeURIComponent(release.version)}`);
    if (createdRef.object.sha !== target) {
      throw new Error(`${release.version} 생성 결과가 예상 SHA ${target}과 다릅니다.`);
    }
  }
}

if (process.argv.includes("--validate")) validateManifest();
else await backfill();
