import { execFileSync } from "node:child_process";

const BACKFILL_BASELINE = "v0.7.6";

function parseVersion(value) {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

export function nextVersion(latest, subject) {
  const parts = parseVersion(latest);
  if (!parts) throw new Error(`최신 태그가 SemVer가 아닙니다: ${latest}`);
  const [major, minor, patch] = parts;
  return subject.startsWith("feat:") ? `v${major}.${minor + 1}.0` : `v${major}.${minor}.${patch + 1}`;
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function releaseCurrent() {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY || !process.env.GITHUB_SHA) {
    throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA가 필요합니다.");
  }
  const tags = await github("/tags?per_page=100");
  const versions = tags.map((tag) => ({ tag, parts: parseVersion(tag.name) })).filter((entry) => entry.parts)
    .sort((left, right) => left.parts[0] - right.parts[0] || left.parts[1] - right.parts[1] || left.parts[2] - right.parts[2]);
  if (!versions.length) throw new Error("기준 SemVer 태그가 없습니다.");
  if (!versions.some((entry) => entry.tag.name === BACKFILL_BASELINE)) {
    console.log(`과거 릴리즈 백필(${BACKFILL_BASELINE})이 끝나지 않아 자동 릴리즈를 건너뜁니다.`);
    return;
  }
  const alreadyTagged = versions.find((entry) => entry.tag.commit.sha === process.env.GITHUB_SHA);
  if (alreadyTagged) {
    console.log(`현재 커밋은 이미 ${alreadyTagged.tag.name}으로 릴리즈되었습니다.`);
    return;
  }

  const subject = execFileSync("git", ["log", "-1", "--format=%s"], { encoding: "utf8" }).trim();
  const version = nextVersion(versions.at(-1).tag.name, subject);
  const pr = /\(#(\d+)\)\s*$/.exec(subject)?.[1];
  const cleanTitle = subject.replace(/\s*\(#\d+\)\s*$/, "");
  await github("/releases", {
    method: "POST",
    body: JSON.stringify({
      tag_name: version,
      target_commitish: process.env.GITHUB_SHA,
      name: `${version} · ${cleanTitle.replace(/^[^:]+:\s*/, "")}`,
      body: [
        "## 포함 변경",
        "",
        ...(pr ? [`- PR: [#${pr}](https://github.com/${process.env.GITHUB_REPOSITORY}/pull/${pr})`] : []),
        `- 변경: ${cleanTitle}`,
        `- 기준 커밋: \`${process.env.GITHUB_SHA}\``,
        "",
        "이 릴리즈는 main에 병합된 PR 한 건을 기준으로 자동 생성되었습니다.",
      ].join("\n"),
      draft: false,
      prerelease: false,
      make_latest: "true",
    }),
  });
  const ref = await github(`/git/ref/tags/${encodeURIComponent(version)}`);
  if (ref.object.sha !== process.env.GITHUB_SHA) throw new Error(`${version} 태그 SHA 검증에 실패했습니다.`);
  console.log(`현재 PR 릴리즈 생성: ${version} → ${process.env.GITHUB_SHA.slice(0, 7)}`);
}

if (process.argv.includes("--validate")) {
  const cases = [
    ["v0.7.2", "feat: 인트로 개선 (#38)", "v0.8.0"],
    ["v0.8.0", "fix: 레이아웃 수정 (#39)", "v0.8.1"],
    ["v0.8.1", "docs: README 최신화 (#40)", "v0.8.2"],
  ];
  for (const [latest, subject, expected] of cases) {
    const actual = nextVersion(latest, subject);
    if (actual !== expected) throw new Error(`${latest} + ${subject}: ${actual} != ${expected}`);
  }
  console.log("현재 PR SemVer 계산 검증 완료");
} else await releaseCurrent();
