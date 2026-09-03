import Link from "next/link";

export default function PolicyFooterLinks() {
  return <nav className="policy-footer-links" aria-label="서비스 정책">
    <Link href="/policies">운영정책</Link>
    <Link href="/privacy">개인정보처리방침</Link>
    <Link href="/terms">이용약관</Link>
  </nav>;
}
