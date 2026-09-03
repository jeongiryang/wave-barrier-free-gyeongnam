import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "W.A.V.E의 개인정보 처리 목적, 항목, 보관, 파기와 사용자 권리를 안내합니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <main className="policy-page" id="main">
    <nav aria-label="정책 페이지 이동"><Link href="/">W.A.V.E 홈</Link><Link href="/policies">운영정책</Link><Link href="/terms">서비스 이용약관</Link></nav>
    <header><p>PRIVACY POLICY</p><h1>필요한 정보만,<br />쓰임과 저장 위치를 분명하게.</h1><span>정책 버전 1.0 · 시행일 2026년 9월 3일</span></header>

    <aside className="policy-callout policy-callout-primary"><strong>한눈에 보기</strong><p>핵심 여행 설계와 지도는 계정 없이 사용할 수 있습니다. 정확한 현재 위치와 사진 원본은 서버에 저장하지 않으며, 광고 목적의 추적기를 사용하지 않습니다.</p></aside>

    <nav className="policy-toc" aria-label="개인정보처리방침 목차">
      <a href="#privacy-purpose">처리 목적·항목</a><a href="#privacy-retention">보관·파기</a><a href="#privacy-providers">외부 제공처</a><a href="#privacy-rights">사용자 권리</a><a href="#privacy-security">안전조치</a><a href="#privacy-contact">문의·구제</a>
    </nav>

    <article className="policy-article">
      <section id="privacy-purpose"><p className="policy-section-kicker">01 · PURPOSE</p><h2>처리 목적과 항목</h2><p className="policy-lead">W.A.V.E 운영팀은 회원 인증, 커뮤니티 운영, 여행 공유, 장소 편의정보 개선과 보안 대응에 필요한 범위에서만 정보를 처리합니다.</p>
        <div className="policy-table-wrap" role="region" aria-label="기능별 개인정보 처리 항목 표" tabIndex={0}><table><thead><tr><th scope="col">기능</th><th scope="col">처리 항목</th><th scope="col">목적</th></tr></thead><tbody>
          <tr><th scope="row">계정·인증</th><td>이메일, 인증정보, 세션정보, 인증 제공처 사용자 ID</td><td>가입, 로그인, 비밀번호 재설정, 계정 관리</td></tr>
          <tr><th scope="row">커뮤니티</th><td>사용자 ID, 표시 이름, 게시글·댓글·좋아요·신고 내용과 처리 상태, 작성 시각</td><td>콘텐츠 공개, 작성자 권한 확인, 신고 검토</td></tr>
          <tr><th scope="row">공유 여행</th><td>무작위 공유 ID, 선택 지역·여행 조건·날짜·장소 식별자, 출발지 표시 이름</td><td>링크로 여행 계획 열기와 최신 정보 복원</td></tr>
          <tr><th scope="row">장소 편의 제보</th><td>장소 식별자·이름, 제보 분류와 자유 입력 내용, 작성 시각</td><td>시설 정보 확인과 서비스 품질 개선</td></tr>
          <tr><th scope="row">접속·운영</th><td>호스팅 제공처가 처리하는 IP, 브라우저·요청 메타데이터와 오류 기록</td><td>서비스 제공, 보안 방어, 장애 분석</td></tr>
        </tbody></table></div>
        <p className="policy-note">커뮤니티 데이터베이스에는 이메일과 비밀번호를 저장하지 않습니다. 자유 입력란에는 연락처, 건강정보, 인증정보 등 민감한 내용을 작성하지 마세요.</p>
      </section>

      <section id="privacy-retention"><p className="policy-section-kicker">02 · RETENTION</p><h2>보관 기간과 파기</h2>
        <div className="policy-detail-grid">
          <section><h3>계정·커뮤니티</h3><p>계정은 탈퇴할 때까지, 커뮤니티 콘텐츠는 사용자가 삭제하거나 계정을 탈퇴할 때까지 보관합니다. 신고 자료는 검토와 조치가 끝날 때까지 처리하며 관련 콘텐츠 또는 계정 삭제 시 함께 정리합니다.</p></section>
          <section><h3>공유 여행·제보</h3><p>공유 여행은 생성 후 30일, 탈퇴 확인용 일회성 토큰 해시는 최대 48시간 보관합니다. 로그인 없이 남긴 장소 편의 제보는 작성 후 1년이 지나면 매일 예약 작업으로 삭제합니다.</p></section>
          <section><h3>기기 안의 정보</h3><p>테마·언어·동작 설정, 여행 조건, 저장 장소, 일정과 최대 20개 여행집은 브라우저 저장소에만 둡니다. 사이트 데이터를 지우면 삭제되며 W.A.V.E가 서버에서 복구할 수 없습니다.</p></section>
          <section><h3>파기 방법</h3><p>데이터베이스 행은 보관 목적이 끝나면 삭제 쿼리로 제거하고, 일회성 토큰은 원문 대신 SHA-256 해시만 저장한 뒤 사용 즉시 또는 만료 시 삭제합니다. 법령상 별도 보존 의무가 생기면 해당 기간 동안 분리 보관합니다.</p></section>
        </div>
      </section>

      <section id="privacy-providers"><p className="policy-section-kicker">03 · PROVIDERS</p><h2>외부 제공처와 처리 경계</h2>
        <div className="policy-table-wrap" role="region" aria-label="외부 제공처별 개인정보 처리 경계 표" tabIndex={0}><table><thead><tr><th scope="col">제공처</th><th scope="col">이용 목적</th><th scope="col">전달·처리될 수 있는 정보</th></tr></thead><tbody>
          <tr><th scope="row">Vercel</th><td>웹 호스팅과 서버 함수 실행</td><td>접속 IP, 요청·브라우저 메타데이터, 오류 기록</td></tr>
          <tr><th scope="row">Neon</th><td>계정 인증과 서비스 데이터베이스</td><td>이메일·인증정보·세션, 사용자 ID와 서비스 저장 항목</td></tr>
          <tr><th scope="row">Kakao·ODsay</th><td>지도, 장소 검색, 자동차·대중교통 경로</td><td>검색어, 선택 장소와 출발·도착 좌표</td></tr>
          <tr><th scope="row">한국관광공사·공공데이터포털·한국도로공사</th><td>관광·교통·편의정보 조회</td><td>선택 지역, 날짜, 장소·노선 조회 조건</td></tr>
          <tr><th scope="row">Open-Meteo·OpenStreetMap</th><td>날씨 조회와 대체 지도 타일</td><td>지역 좌표, 접속 IP와 요청 메타데이터</td></tr>
        </tbody></table></div>
        <p>선택한 좌표와 검색 조건은 요청한 기능의 응답을 받는 데 사용되며 계정 이메일이나 커뮤니티 사용자 ID와 함께 외부 데이터 제공처에 보내지 않습니다. 각 제공처의 인프라 위치와 보관은 해당 제공처의 정책과 운영 설정을 따를 수 있습니다.</p>
      </section>

      <section id="privacy-rights"><p className="policy-section-kicker">04 · RIGHTS</p><h2>사용자의 권리와 행사 방법</h2>
        <ul className="policy-list"><li>자신이 쓴 게시글과 댓글을 서비스에서 직접 수정·삭제할 수 있습니다.</li><li>계정 관리에서 비밀번호 변경과 탈퇴를 요청할 수 있습니다. 인증 제공처가 자동 탈퇴를 지원하지 않는 상태에서는 운영 문의로 수동 처리를 요청할 수 있습니다.</li><li>자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 운영 문의로 요청할 수 있습니다. 본인 확인과 다른 사람의 권리 보호에 필요한 최소한의 정보를 추가로 요청할 수 있습니다.</li><li>브라우저 저장 정보는 브라우저의 사이트 데이터 삭제 기능으로 직접 지울 수 있습니다.</li><li>위치 권한은 브라우저 설정에서 언제든 철회할 수 있습니다. 철회해도 지역·장소를 직접 선택해 이용할 수 있습니다.</li></ul>
      </section>

      <section id="privacy-security"><p className="policy-section-kicker">05 · SECURITY</p><h2>자동 수집과 안전조치</h2>
        <div className="policy-detail-grid"><section><h3>쿠키와 추적</h3><p>로그인 상태 유지에 인증 세션 쿠키를 사용합니다. 광고·행동 분석 목적의 추적기는 연결하지 않으며, 화면 설정과 여행 기록에는 쿠키 대신 브라우저 저장소를 사용합니다.</p></section><section><h3>위치와 사진</h3><p>현재 위치는 버튼을 누르고 브라우저 권한을 허용한 때만 사용합니다. 사진 코스는 파일의 앞부분만 기기에서 읽고 원본을 업로드하지 않으며, 내보내기 자료에서 GPS 좌표를 제거합니다.</p></section><section><h3>기술적 보호</h3><p>HTTPS, 보안 응답 헤더, 요청 출처·크기·권한 검사, 속도 제한, 비밀키의 서버 환경 변수 분리, 운영 로그의 좌표·이메일·토큰 필드 차단을 적용합니다.</p></section><section><h3>최소 접근</h3><p>커뮤니티 상태 변경은 서버 세션의 사용자 ID로 소유권을 확인하고, 신고 검토 화면은 등록된 운영자 ID만 접근할 수 있습니다.</p></section></div>
      </section>

      <section id="privacy-contact"><p className="policy-section-kicker">06 · CONTACT</p><h2>보호 담당, 문의와 권리 구제</h2><p>개인정보 보호 업무 책임: <strong>W.A.V.E 운영팀</strong>. 열람·정정·삭제·침해 문의는 <a href="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues" target="_blank" rel="noreferrer">W.A.V.E 운영 문의</a>로 접수합니다. 공개 문의에는 개인정보를 적지 말고, 운영팀의 비공개 확인 안내를 기다려 주세요.</p>
        <ul className="policy-list"><li><a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer">개인정보침해 신고센터</a> · 국번 없이 118</li><li><a href="https://www.kopico.go.kr" target="_blank" rel="noreferrer">개인정보 분쟁조정위원회</a> · 1833-6972</li><li><a href="https://www.privacy.go.kr" target="_blank" rel="noreferrer">개인정보 포털</a> · 권리 행사와 제도 안내</li></ul>
        <p className="policy-note">이 방침의 내용이 바뀌면 버전, 시행일과 주요 변경 내용을 이 페이지에 공개합니다.</p>
      </section>
    </article>
    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/policies">운영정책 보기</Link><Link href="/terms">서비스 이용약관</Link></footer>
  </main>;
}
