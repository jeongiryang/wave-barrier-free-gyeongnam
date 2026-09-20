import WaveHeader from "../../components/WaveHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { isKakaoAuthConfigured } from "../../lib/auth/server";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "WAVE의 개인정보 처리 목적, 항목, 보관, 파기와 사용자 권리를 안내합니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const kakaoEnabled = isKakaoAuthConfigured();
  return <main className="wave-night night-secondary policy-page" id="main">
    <WaveHeader current="other" />
    <nav aria-label="정책 페이지 이동"><Link href="/">WAVE 홈</Link><Link href="/policies">운영정책</Link><Link href="/terms">서비스 이용약관</Link></nav>
    <header><p>PRIVACY POLICY</p><h1>필요한 정보만,<br />쓰임과 저장 위치를 분명하게.</h1><span>정책 버전 1.5 · 시행일 2026년 9월 20일 · 현장 확인 정보 안내 추가</span></header>

    <aside className="policy-callout policy-callout-primary"><strong>한눈에 보기</strong><p>핵심 여행 설계와 지도는 계정 없이 사용할 수 있습니다. 정확한 현재 위치와 사진 원본은 서버에 저장하지 않습니다. 직접 게시한 현장 사진은 크기를 줄이고 메타데이터를 제거해 후기와 함께 공개·보관합니다. 광고 목적의 추적기는 사용하지 않습니다.</p></aside>

    <nav className="policy-toc" aria-label="개인정보처리방침 목차">
      <a href="#privacy-purpose">처리 목적·항목</a><a href="#privacy-retention">보관·파기</a><a href="#privacy-providers">외부 제공처</a><a href="#privacy-rights">사용자 권리</a><a href="#privacy-security">안전조치</a><a href="#privacy-contact">문의·구제</a>
    </nav>

    <article className="policy-article">
      <section id="privacy-purpose"><p className="policy-section-kicker">01 · PURPOSE</p><h2>처리 목적과 항목</h2><p className="policy-lead">WAVE 운영팀은 회원 인증, 커뮤니티 운영, 여행 공유, 장소 편의정보 개선과 보안 대응에 필요한 범위에서만 정보를 처리합니다.</p>
        <div className="policy-table-wrap" role="region" aria-label="기능별 개인정보 처리 항목 표" tabIndex={0}><table><thead><tr><th scope="col">기능</th><th scope="col">처리 항목</th><th scope="col">목적</th></tr></thead><tbody>
          <tr><th scope="row">계정·인증</th><td>이메일, 직접 설정한 WAVE 닉네임, 인증정보, 세션정보, 인증 제공처 사용자 ID</td><td>가입, 로그인, 비밀번호 재설정, 계정 관리</td></tr>
          {kakaoEnabled && <tr><th scope="row">카카오 로그인</th><td>카카오 회원번호, 확인된 이메일, 암호화한 연결 인증 토큰</td><td>로그인과 명시적 계정 연결·연결 해제. 카카오 닉네임·사진·친구 목록은 요청하지 않습니다.</td></tr>}
          <tr><th scope="row">커뮤니티</th><td>사용자 ID, 표시 이름, 게시글·댓글·좋아요·신고 내용과 처리 상태, 실제 방문일·시설 경험, 선택한 현장 사진 최대 2장과 설명, 작성 시각</td><td>콘텐츠 공개, 작성자 권한 확인, 신고 검토. 현장 사진은 최대 800px·120KiB JPEG로 변환하고 위치·촬영기기 등 메타데이터를 제거합니다. 게시 전 공개 여부를 확인받습니다.</td></tr>
          <tr><th scope="row">현장에서 확인한 정보</th><td>사용자 ID, 표시 이름, 선택한 공개 장소의 식별자·이름, 확인 날짜, 직접 작성한 내용</td><td>여행자 경험을 공식 시설정보와 분리해 공개합니다. 장애·건강·복지 수급 정보, 현재 위치·좌표, 사진은 요청하거나 저장하지 않습니다.</td></tr>
          <tr><th scope="row">공유 여행</th><td>무작위 공유 ID, 선택 지역·여행 조건·날짜·장소 식별자, 출발지 표시 이름</td><td>링크로 여행 계획 열기와 최신 정보 복원</td></tr>
          <tr><th scope="row">계정 여행·동행자</th><td>사용자 ID, 직접 저장한 여행 제목·지역·날짜·공식 장소 ID·순서·메모·상태, 동행자의 표시 이름·투표·의견, 초대 권한과 작성 시각</td><td>여러 기기에서 여행 이어하기, 초대받은 동행자의 참여와 의견 교환. 관광 API 응답·정밀 위치·사진 원본은 계정 여행 DB에 보관하지 않습니다.</td></tr>
          <tr><th scope="row">계정 편의 조건</th><td>사용자가 저장을 선택한 편의 조건과 변경 시각</td><td>다음 여행에서 조건 복원. 선택 사항이며 동행자와 공유하지 않습니다.</td></tr>
          <tr><th scope="row">카카오톡 여행 공유·나에게 보내기</th><td>공유 카드의 지역·날짜·장소 수·공개 여행 링크, 나에게 보내기의 저장한 여행 제목·날짜·장소 수·계정 여행 링크, 메시지 동의 상태와 인증 토큰</td><td>사용자가 요청한 카카오톡 공유와 나와의 채팅 전송. 친구 목록은 수집하지 않으며 메시지 권한은 기능 이용 시 별도로 동의받습니다. 전송 본문은 별도 DB 기록하지 않습니다.</td></tr>
          <tr><th scope="row">장소 편의 제보</th><td>장소 식별자·이름, 제보 분류와 자유 입력 내용, 작성 시각</td><td>시설 정보 확인과 서비스 품질 개선</td></tr>
          <tr><th scope="row">접속·운영</th><td>호스팅 제공처가 처리하는 IP, 브라우저·요청 메타데이터와 오류 기록</td><td>서비스 제공, 보안 방어, 장애 분석</td></tr>
          <tr><th scope="row">나루 AI 여행 대화</th><td>보낸 질문과 최근 대화 최대 6개, 선택적으로 첨부한 축소 사진 1장, 선택한 지역·편의·활동·날짜, 선택한 안내 선호(짧은 문장·한 번에 하나씩·문자 안내 우선), 현재 검색하거나 담은 공개 장소의 식별자·이름</td><td>WAVE가 직접 운영하는 AI 서버에서 요청을 해석하고 여행 작업을 제안합니다. 계정 정보와 현재 위치 좌표는 대화 문맥에 자동으로 포함하지 않습니다. 장애 여부·유형·질병·보조기기 종류는 묻거나 저장하지 않으며, 사용자가 고른 편의 조건과 안내 선호만 대화에 반영합니다. 변경할 조건과 장소를 화면에서 확인한 뒤 적용합니다.</td></tr>
          <tr><th scope="row">간편 음성·문자 일정 조작</th><td>사용자가 마이크를 시작한 동안의 음성과 화면에 임시 표시하는 인식 결과·입력 명령</td><td>현재 장소의 정보 열기·일정 추가·제거를 미리 보여주고 명시적으로 확인한 한 작업만 수행합니다. 음성·명령문은 WAVE 서버나 브라우저 저장소에 보관하지 않습니다. 변경한 일정은 기존 저장 선택에 따릅니다.</td></tr>
          <tr><th scope="row">현장 음성 글자 표시</th><td>사용자가 고지를 확인하고 마이크를 시작한 동안의 음성과 화면에 임시 표시하는 인식 결과</td><td>현장에서 말한 내용을 큰 글자로 보여줍니다. 음성과 인식 결과는 WAVE 서버·나루·데이터베이스·로그·브라우저 저장소로 보내거나 저장하지 않고, 화면을 닫으면 지웁니다.</td></tr>
        </tbody></table></div>
        <p className="policy-note">커뮤니티 데이터베이스에는 이메일과 비밀번호를 저장하지 않습니다. 자유 입력란에는 연락처, 건강정보, 인증정보 등 민감한 내용을 작성하지 마세요.</p>
      </section>

      <section id="privacy-experience"><h2>감각지도·동행 일정·여행여권</h2><p>직접 공유한 현장 정보는 장소 ID, 관찰 시각, 소리·혼잡·휠체어 이동·휴식·빛의 선택값과 작성자 ID를 저장합니다. 공개 화면에는 작성자 ID를 표시하지 않으며 2시간이 지난 관찰은 현재 정보에서 제외하고, 저장 후 24시간이 지나면 예약 정리 작업에서 삭제합니다. 본인의 제보는 장소 화면에서 삭제할 수 있습니다.</p><p>동행 일정은 만든 사람의 계정 ID, 공개 장소 ID·일정, 탑승자 별칭·분담 금액·직접 입력한 배차 상태, 변경 제안·최근 50개 이력을 30일 보관합니다. 초대 링크의 비밀값은 원문 대신 해시로 저장하고 브라우저에는 HttpOnly 쿠키를 둡니다. 보기·제안·편집 초대를 종료할 수 있으며 계정 탈퇴 시 소유한 동행 일정과 현장 제보를 삭제합니다. 연락처나 건강정보를 별칭에 적지 마세요.</p><p>여행여권은 최대 300개의 개인 참여 기록을 이 기기에만 보관하며 직접 삭제·내보내기할 수 있습니다. 기기 위치로 방문 기록을 선택하면 기기 안에서 근접 여부를 계산하고 좌표 없이 확인 방식만 기록합니다. 실제 방문 인증이 아닙니다. 가까운 일정 장소 찾기의 GPS는 기기에서 거리 계산에만 이용하며 서버 전송·저장하지 않습니다. 공간 음향은 선택한 공식 음원을 제공처에서 받아 브라우저에서 처리하고 재생을 종료하거나 화면을 닫으면 해제합니다.</p></section>

      <section id="privacy-retention"><p className="policy-section-kicker">02 · RETENTION</p><h2>보관 기간과 파기</h2>
        <div className="policy-detail-grid">
          <section><h3>계정·커뮤니티·계정 여행</h3><p>계정은 탈퇴할 때까지, 현장 사진을 포함한 커뮤니티 콘텐츠와 계정 여행·편의 조건은 사용자가 삭제하거나 계정을 탈퇴할 때까지 보관합니다. 계정 여행을 삭제하면 해당 여행의 초대·참여·투표·의견도 삭제합니다. 참여를 취소하거나 해제하면 해당 참여자의 투표·의견도 삭제합니다. 초대 권한은 7일 후 또는 초대 중지 시 만료되며, 참여를 계속하려는 동행자는 개별 관리할 수 있습니다. 신고 자료는 검토와 조치가 끝날 때까지 처리하며 관련 콘텐츠 또는 계정 삭제 시 함께 정리합니다.</p></section>
          <section><h3>공유 여행·제보</h3><p>공유 여행은 생성 후 30일, 탈퇴 확인용 일회성 토큰 해시는 최대 48시간 보관합니다. 로그인 없이 남긴 장소 편의 제보는 작성 후 1년이 지나면 매일 예약 작업으로 삭제합니다.</p></section>
          <section><h3>기기 안의 정보</h3><p>선택 중인 편의 조건은 현재 탭의 임시 저장소에 두어 새로고침해도 복구합니다. 따로 저장을 선택한 편의 프로필, 지역·활동, 저장 장소·일정과 최대 20개 여행집은 브라우저의 기기 저장소에 둡니다. 내 여행 취향 정리는 사용자가 직접 만든 일정의 지역·편의 조건·장소 종류·여행 길이만 기기 안에서 세며, 화면 조회·클릭·검색어·머문 시간·현재 위치를 수집하거나 계산 결과를 저장·전송하지 않습니다. 사이트 데이터를 지우면 삭제되며 WAVE가 서버에서 복구할 수 없습니다. 계정 저장을 직접 선택한 여행과 편의 조건은 위 계정 보관 기준을 따릅니다.</p></section>
          <section><h3>나루의 대화</h3><p>대화는 현재 페이지의 메모리에 최근 30개 메시지만 유지하며, 새로고침하거나 페이지를 떠나면 사라집니다. 요청 처리를 위해 웹 서버와 WAVE AI 서버를 거치지만 질문·답변·첨부 사진을 데이터베이스나 애플리케이션 로그에 기록하거나 모델 학습에 사용하지 않습니다. 사진은 브라우저 메모리에 보내기 전까지 유지하고 성공 후 제거합니다. 실패·중단 시 재전송을 위해 남기며 삭제할 수 있습니다. 사진 요청은 사진 1장과 해당 질문만 전달하고 이전 대화는 전달하지 않습니다. 대화로 변경한 일정은 기존 기기 저장·계정 저장 선택에 따릅니다.</p></section>
          <section><h3>파기 방법</h3><p>데이터베이스 행은 보관 목적이 끝나면 삭제 쿼리로 제거하고, 일회성 토큰은 원문 대신 SHA-256 해시만 저장한 뒤 사용 즉시 또는 만료 시 삭제합니다. 법령상 별도 보존 의무가 생기면 해당 기간 동안 분리 보관합니다.</p></section>
        </div>
      </section>

      <section id="privacy-providers"><p className="policy-section-kicker">03 · PROVIDERS</p><h2>외부 제공처와 처리 경계</h2>
        <div className="policy-table-wrap" role="region" aria-label="외부 제공처별 개인정보 처리 경계 표" tabIndex={0}><table><thead><tr><th scope="col">제공처</th><th scope="col">이용 목적</th><th scope="col">전달·처리될 수 있는 정보</th></tr></thead><tbody>
          <tr><th scope="row">Vercel</th><td>웹 호스팅과 서버 함수 실행</td><td>접속 IP, 요청·브라우저 메타데이터, 오류 기록. 나루를 이용할 때 보낸 대화와 여행 문맥 또는 첨부 사진과 질문을 WAVE AI 서버로 중계합니다.</td></tr>
          <tr><th scope="row">Tailscale</th><td>웹 서버와 WAVE AI 서버 사이의 HTTPS 연결 중계</td><td>연결에 필요한 접속·장치 메타데이터와 암호화된 통신을 중계합니다. AI 추론은 WAVE가 운영하는 서버에서 수행합니다.</td></tr>
          <tr><th scope="row">Neon</th><td>계정 인증과 서비스 데이터베이스</td><td>이메일·인증정보·세션, 사용자 ID와 서비스 저장 항목</td></tr>
          {kakaoEnabled && <><tr><th scope="row">Kakao 로그인</th><td>사용자가 선택한 계정 인증과 연결 관리</td><td>카카오 인증 요청, 회원번호·확인된 이메일·연결 인증정보</td></tr><tr><th scope="row">Google Gmail</th><td>본인이 요청한 비밀번호 재설정·탈퇴 확인 메일 발송</td><td>수신 이메일 주소, 한 번만 사용할 수 있는 계정 확인 링크와 메일 내용</td></tr></>}
          <tr><th scope="row">Kakao·ODsay</th><td>지도, 장소 검색, 자동차·대중교통 경로</td><td>검색어, 선택 장소와 출발·도착 좌표</td></tr>
          <tr><th scope="row">한국관광공사·공공데이터포털·한국도로공사</th><td>관광·교통·편의정보 조회</td><td>선택 지역, 날짜, 장소·노선 조회 조건</td></tr>
          <tr><th scope="row">Open-Meteo·OpenStreetMap</th><td>날씨 조회와 대체 지도 타일</td><td>지역 좌표, 접속 IP와 요청 메타데이터</td></tr>
          <tr><th scope="row">브라우저·운영체제의 음성 인식 제공처</th><td>사용자가 직접 시작한 한국어 음성 입력</td><td>마이크 권한을 허용하고 듣기를 시작한 동안의 음성을 인식 서비스가 처리할 수 있습니다. 해당 제공처의 처리·보관 정책과 연결 상태가 적용되며, WAVE 서버는 음성을 받지 않습니다.</td></tr>
        </tbody></table></div>
        {kakaoEnabled && <p>카카오 연결을 해제하면 카카오 인증정보와 로그인 세션을 삭제합니다. WAVE 계정과 작성한 이야기는 유지되며 계정 이메일로 비밀번호를 설정할 수 있습니다. WAVE 계정까지 삭제하려면 계정 관리에서 탈퇴를 요청해 주세요.</p>}
        <p>공개 장소 또는 지도에서 직접 선택한 출발·도착 좌표는 WAVE 경로 서버를 거쳐 Kakao·ODsay로 전달됩니다. 브라우저의 현재 위치 좌표는 선택한 공개 출발지까지의 직선거리를 기기 안에서 계산하는 데만 한 번 사용합니다. 지도·경로·검색·나루 입력으로 넘기거나 저장하지 않습니다.</p>
        <p>음성 듣기는 버튼과 브라우저 권한으로 직접 시작하며, 듣기 취소·도구 닫기·다른 화면으로 이동하면 중단합니다. 브라우저의 마이크 권한을 철회해도 같은 문자 명령을 사용할 수 있습니다. 간편 일정 조작 도구의 명령은 현재 화면에서 임시 처리합니다. 나루에서는 인식한 문장을 확인하고 보내기 버튼을 누르면 문자 질문으로 WAVE AI 서버에 전달합니다. 현장 음성 글자 표시의 인식 결과는 나루로 자동 전달하지 않으며 화면 메모리에만 두고 닫을 때 지웁니다. 브라우저에 따라 음성이 브라우저 제조사 서버로 전송될 수 있지만 WAVE 서버는 마이크 원본 음성과 현장 인식 결과를 받지 않습니다.</p>
        <p>현재 위치로 외부 지도의 중심·표시 범위를 바꾸지 않습니다. 지도 제공처는 직접 선택한 공개 장소의 표시 영역과 접속 IP를 처리할 수 있고, 주변 장소 검색은 그 공개 장소를 기준으로 합니다. 현재 위치 사용 전에 안내와 브라우저 권한을 확인하며 거부해도 여행 설계와 공개 거점 선택을 이용할 수 있습니다.</p>
        <p>검색 조건은 계정 이메일이나 커뮤니티 사용자 ID와 함께 외부 데이터 제공처에 보내지 않습니다. 각 제공처의 인프라 위치와 보관은 해당 제공처의 정책과 운영 설정을 따를 수 있습니다. 위치정보 관련 신고·동의 요건 충족 여부는 운영주체의 법적 검토가 필요하며 이 설명만으로 충족을 보장하지 않습니다.</p>
      </section>

      <section id="privacy-rights"><p className="policy-section-kicker">04 · RIGHTS</p><h2>사용자의 권리와 행사 방법</h2>
        <ul className="policy-list"><li>자신이 쓴 게시글과 댓글을 서비스에서 직접 수정·삭제할 수 있습니다.</li><li>계정 관리에서 비밀번호 변경과 탈퇴를 요청할 수 있습니다. 인증 제공처가 자동 탈퇴를 지원하지 않는 상태에서는 운영 문의로 수동 처리를 요청할 수 있습니다.</li><li>자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 운영 문의로 요청할 수 있습니다. 본인 확인과 다른 사람의 권리 보호에 필요한 최소한의 정보를 추가로 요청할 수 있습니다.</li><li>브라우저 저장 정보는 브라우저의 사이트 데이터 삭제 기능으로 직접 지울 수 있습니다.</li><li>위치 권한은 브라우저 설정에서 언제든 철회할 수 있습니다. 철회해도 지역·장소를 직접 선택해 이용할 수 있습니다.</li></ul>
      </section>

      <section id="privacy-security"><p className="policy-section-kicker">05 · SECURITY</p><h2>자동 수집과 안전조치</h2>
        <div className="policy-detail-grid"><section><h3>쿠키와 추적</h3><p>로그인 상태 유지에 인증 세션 쿠키를 사용합니다. 광고·행동 분석 목적의 추적기는 연결하지 않으며, 화면 설정과 여행 기록에는 쿠키 대신 브라우저 저장소를 사용합니다.</p></section><section><h3>위치와 사진</h3><p>현재 위치는 버튼을 누르고 브라우저 권한을 허용한 때만 사용합니다. 사진 코스는 파일의 앞부분만 기기에서 읽고 원본을 업로드하지 않으며, 내보내기 자료에서 GPS 좌표를 제거합니다. 사진의 GPS는 기기 안에서 사진을 묶는 데만 사용하며, 외부 관광정보를 찾을 지역은 직접 선택합니다. 나루 사진 질문은 보내기를 누를 때 최대 1600px·800KB JPEG 한 장을 WAVE 서버와 AI 서버로 전송하며 저장하지 않습니다. 브라우저에서 다시 인코딩하고 위치·촬영기기·색상 프로필 등 메타데이터를 제거합니다. 사진에 보이는 연락처·예약정보는 자동으로 가리지 않으므로 보낼 부분을 직접 확인해 주세요. 별도의 현장 후기 사진은 명시적으로 등록할 때 축소·변환한 이미지와 설명을 공개 저장합니다. 얼굴·차량 번호처럼 사진에 보이는 내용은 자동으로 가리지 않으므로 게시 전에 직접 확인해 주세요.</p></section><section><h3>기술적 보호</h3><p>HTTPS, 보안 응답 헤더, 요청 출처·크기·권한 검사, 속도 제한, 비밀키의 서버 환경 변수 분리, 운영 로그의 좌표·이메일·토큰 필드 차단을 적용합니다.</p></section><section><h3>최소 접근</h3><p>커뮤니티 상태 변경은 서버 세션의 사용자 ID로 소유권을 확인하고, 신고 검토 화면은 등록된 운영자 ID만 접근할 수 있습니다.</p></section></div>
      </section>

      <section id="privacy-contact"><p className="policy-section-kicker">06 · CONTACT</p><h2>보호 담당, 문의와 권리 구제</h2><p>개인정보 보호 업무 책임: <strong>WAVE 운영팀</strong>. 열람·정정·삭제·침해 문의는 <a href="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues" target="_blank" rel="noreferrer">WAVE 운영 문의</a>로 접수합니다. 공개 문의에는 개인정보를 적지 말고, 운영팀의 비공개 확인 안내를 기다려 주세요.</p>
        <ul className="policy-list"><li><a href="https://privacy.kisa.or.kr" target="_blank" rel="noreferrer">개인정보침해 신고센터</a> · 국번 없이 118</li><li><a href="https://www.kopico.go.kr" target="_blank" rel="noreferrer">개인정보 분쟁조정위원회</a> · 1833-6972</li><li><a href="https://www.privacy.go.kr" target="_blank" rel="noreferrer">개인정보 포털</a> · 권리 행사와 제도 안내</li></ul>
        <p className="policy-note">이 방침의 내용이 바뀌면 버전, 시행일과 주요 변경 내용을 이 페이지에 공개합니다.</p>
      </section>
    </article>
    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/policies">운영정책 보기</Link><Link href="/terms">서비스 이용약관</Link></footer>
  </main>;
}
