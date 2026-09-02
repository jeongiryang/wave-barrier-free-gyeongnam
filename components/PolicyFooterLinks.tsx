import Link from "next/link";

export default function PolicyFooterLinks() {
  return <nav className="policy-footer-links" aria-label="서비스 정책">
    <Link href="/privacy">개인정보</Link>
    <Link href="/terms">이용 안내</Link>
  </nav>;
}
