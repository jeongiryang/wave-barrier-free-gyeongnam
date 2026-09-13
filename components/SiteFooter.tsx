import Link from 'next/link';
import GithubFooterLink from './GithubFooterLink';
import PolicyFooterLinks from './PolicyFooterLinks';

export default function SiteFooter() {
  return <footer className="simple-footer wave-balanced-footer">
    <p>경남 여행을 찾고, 나에게 맞게 계획하세요.</p>
    <nav aria-label="서비스 도움말"><Link href="/guide">사용 방법</Link><Link href="/policies#content-credits">데이터·사진 출처</Link><GithubFooterLink /></nav>
    <PolicyFooterLinks />
    <small>WAVE는 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다.</small>
  </footer>;
}
