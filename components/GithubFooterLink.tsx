const repositoryUrl = "https://github.com/jeongiryang/wave-barrier-free-gyeongnam";

export default function GithubFooterLink() {
  return <a className="github-footer-link" href={repositoryUrl} target="_blank" rel="noreferrer" aria-label="W.A.V.E GitHub 저장소 열기" data-tooltip="GitHub">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.24.7-3.92-1.38-3.92-1.38-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.72.08-.72 1.17.09 1.79 1.21 1.79 1.21 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.74-1.56-2.59-.3-5.31-1.3-5.31-5.69 0-1.26.45-2.28 1.2-3.09-.12-.3-.52-1.48.11-3.06 0 0 .98-.32 3.16 1.18a10.8 10.8 0 0 1 5.78 0c2.18-1.5 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.06.75.81 1.2 1.83 1.2 3.09 0 4.4-2.73 5.39-5.33 5.68.42.37.79 1.09.79 2.19v3.24c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  </a>;
}
