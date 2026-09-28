import WaveHeader from "../../components/WaveHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { regionShowcaseAlbums } from "../../features/landing/region-showcase-photos";
import { regionPhotoSource } from "../../features/landing/region-photo-sources";
import { horizonPhotos } from "../../features/landing/horizon-photos";
import PhotoCredits from "../../features/landing/components/PhotoCredits";

export const metadata: Metadata = {
  title: "서비스 운영정책",
  description: "WAVE의 개인정보, 커뮤니티 운영, 서비스 신뢰와 이용 기준을 한곳에서 확인합니다.",
  alternates: { canonical: "/policies" },
};

import { decliningRegionNotice } from "../../features/planner/declining-regions";

const inquiryUrl = "https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues";

export default function PoliciesPage() {
  return <main className="wave-night night-secondary policy-page policy-hub" id="main">
    <WaveHeader current="other" />
    <nav aria-label="정책 페이지 이동"><Link href="/">WAVE 홈</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">서비스 이용약관</Link></nav>
    <header>
      <p>POLICY CENTER</p>
      <h1>안심하고 계획하고,<br />서로의 이동을 존중하도록.</h1>
      <span>정책 버전 1.0 · 시행일 2026년 9월 3일</span>
    </header>

    <section className="policy-summary" aria-labelledby="policy-summary-title">
      <div><p>운영 원칙</p><h2 id="policy-summary-title">정보의 출처와 한계를 숨기지 않습니다.</h2></div>
      <p>WAVE는 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다. WAVE는 공식 관광정보와 여행자 경험을 구분하고, 필요한 데이터만 처리하며, 신고와 장애를 확인 가능한 절차로 다룹니다. 중요한 정책 변경은 이 화면의 시행일과 변경 내용을 갱신해 알립니다.</p>
    </section>

    <div className="policy-link-grid" aria-label="정책 문서 바로가기">
      <Link href="/privacy"><span>01</span><strong>개인정보처리방침</strong><small>수집 항목 · 보관 · 파기 · 권리 행사</small></Link>
      <Link href="/terms"><span>02</span><strong>서비스 이용약관</strong><small>서비스 범위 · 계정 · 게시물 · 책임</small></Link>
      <a href="#community-policy"><span>03</span><strong>커뮤니티 운영정책</strong><small>작성 기준 · 신고 · 검토 · 이의제기</small></a>
      <a href="#service-policy"><span>04</span><strong>서비스 운영정책</strong><small>정보 신뢰 · 장애 · 변경 · 중단</small></a>
      <a href="#travel-information-policy"><span>05</span><strong>여행 정보 이용 기준</strong><small>관광 통계 · 이동 · 편의 · 테마 정보</small></a>
    </div>

    <article className="policy-article">
      <section id="community-policy">
        <p className="policy-section-kicker">COMMUNITY</p>
        <h2>커뮤니티 운영정책</h2>
        <p className="policy-lead">여행자의 실제 경험은 소중하지만 한 사람의 경험이 모든 사람의 이용 가능성을 보장하지는 않습니다. WAVE는 공식 편의정보와 사용자 후기를 분리해 표시하고 다음 기준으로 공개 공간을 운영합니다.</p>
        <div className="policy-detail-grid">
          <section><h3>환영하는 내용</h3><ul><li>방문 시점과 실제 이용 조건이 드러나는 구체적인 경험</li><li>휠체어 이동, 보행, 감각·인지 지원과 관련된 확인 가능한 정보</li><li>시설이나 교통 정보가 바뀌었다는 정중한 수정 제보</li></ul></section>
          <section><h3>제한하는 내용</h3><ul><li>타인의 연락처·얼굴·건강정보 등 동의 없는 개인정보</li><li>혐오, 괴롭힘, 위협, 사칭, 불법행위 조장, 반복 광고</li><li>출처를 꾸미거나 공식 확인처럼 오해시키는 허위 정보</li></ul></section>
          <section><h3>신고와 임시조치</h3><p>로그인한 사용자는 같은 대상에 한 번 신고할 수 있고 하루 최대 10건으로 제한됩니다. 서로 다른 사용자 3명의 신고가 모이면 해당 내용은 자동으로 검토 상태가 되어 공개 목록에서 잠시 숨겨집니다.</p></section>
          <section><h3>검토와 이의제기</h3><p>운영자는 맥락, 최신성, 권리 침해와 안전 위험을 확인해 공개 유지·숨김을 결정합니다. 작성자 또는 신고자는 민감정보를 제외하고 운영 문의에 게시물 주소와 사유를 남겨 재검토를 요청할 수 있습니다.</p></section>
        </div>
        <aside className="policy-callout"><strong>조치 원칙</strong><p>최소한의 범위로 조치하고, 단순한 의견 차이만으로 삭제하지 않습니다. 다만 개인정보 노출, 구체적인 위해 가능성 또는 반복적인 서비스 방해는 즉시 숨김·이용 제한 대상이 될 수 있습니다.</p></aside>
      </section>

      <section id="travel-records"><h2>지역별 방문 기록</h2><p>지역별 방문 표시는 여행 당일 안내에서 사용자가 직접 방문 완료를 누른 기록을 기준으로 합니다. 여행을 삭제하면 해당 여행의 지역 표시도 사라집니다. 저장한 일정이나 지역 사진만으로 실제 방문을 인증하지 않습니다.</p></section><section id="crowd-information"><h2>혼잡도 정보 이용 안내</h2><p>지도의 여유·보통·혼잡 표시는 한국관광공사가 제공하는 30일 혼잡 예측 정보입니다. 실시간 인원, 대기시간 또는 특정 방문일의 혼잡도를 뜻하지 않습니다. 예측 비율과 기준일은 지도에서 정보 아이콘을 눌러 확인할 수 있습니다. 실제 현장 상황은 달라질 수 있습니다.</p></section>
      <section id="preview-policy"><h2>미리보기와 계정 이용</h2><p>로컬 미리보기는 계정 인증에 연결하지 않습니다. 로그인과 회원가입은 운영 WAVE에서 이용할 수 있으며, 운영 사이트에 로그인해도 미리보기의 로그인 상태는 바뀌지 않습니다.</p></section>
      <section id="service-policy">
        <p className="policy-section-kicker">OPERATIONS</p>
        <h2>서비스 운영정책</h2>
        <div className="policy-detail-grid">
          <section><h3>정보 신뢰 기준</h3><p>공식 제공처, 조회 시각, 확인됨·일부 확인·재확인 필요 상태를 함께 표시합니다. 공식 편의근거가 없는 항목은 확인된 것처럼 점수에 반영하지 않고, 사용자 제보는 별도 경험 정보로 둡니다.</p></section>
          <section><h3>장애와 성능 저하</h3><p>외부 데이터가 지연되거나 중단되면 추정값을 실제값으로 대체하지 않습니다. 핵심 화면과 API는 매일 자동 점검하며 새 배포에서 문제가 확인되면 직전 정상 배포로 되돌리는 절차를 사용합니다.</p></section>
          <section><h3>기능 변경과 중단</h3><p>안전, 보안, 제공처 정책, 법령 또는 운영 여건에 따라 기능을 변경하거나 일시 중단할 수 있습니다. 사용자 권리나 데이터 보관에 중요한 변경은 시행일 전에 정책 화면 또는 서비스 안에서 알립니다.</p></section>
          <section><h3>연락과 처리 기록</h3><p>오류·접근성 문제·정책 이의는 <a href={inquiryUrl} target="_blank" rel="noreferrer">WAVE 운영 문의</a>에서 접수합니다. 공개 문의에는 이메일, 전화번호, 비밀번호, 인증 링크 등 민감정보를 적지 않아야 합니다.</p></section>
        </div>
      </section>
      <section id="travel-information-policy">
        <h2>여행 정보 이용 기준</h2>
        <div className="policy-detail-grid">
          <section><h3>방문 후기와 시설 제보</h3><p>방문 후기·여행자가 남긴 정보·시설 제보 이력은 사용자가 작성한 경험 기록이며 공식 시설정보와 구분합니다. WAVE가 실제 방문이나 시설 상태를 인증한 기록은 아니며 공식 편의 점수에 반영하지 않습니다. 방문일과 원문을 참고하고, 같은 방문일에 서로 다른 제보가 있으면 운영기관 안내를 함께 확인해 주세요. 정보 수정 제보는 검토 전까지 공식 시설정보를 변경하지 않습니다.</p></section>
          <section><h3>추천 정렬과 조회 시각</h3><p>추천 정렬에는 선택한 공식 편의 항목 중 긍정적으로 확인된 항목의 비율(확인됨 ÷ 전체 선택 항목)을 사용합니다. 시설 없음과 미확인은 구분하며 사진·인기·후기는 계산에 포함하지 않습니다. 화면의 조회 시각은 WAVE가 정보를 가져온 시각이며 제공처가 시설정보를 갱신한 날짜가 아닙니다.</p></section>
          <section><h3>코스·관광 통계</h3><p>걷기 코스는 두루누비 공식 자료를, 함께 살펴볼 관광지는 월별 관광 통계의 자료를 사용합니다. 통계의 관광지 이름은 실제 장소 ID나 편의 확인 결과와 다릅니다. 상세정보에서 출처·기준월과 연결된 장소를 확인할 수 있고, 실제 장소 정보가 연결된 항목을 일정에 담을 수 있습니다.</p></section>
          <section><h3>접근성과 이동 경로</h3><p>걷기 난이도가 쉽거나 경로가 조회됐다는 사실만으로 휠체어 통행, 경사, 저상버스·승강기 운영을 보장하지 않습니다. 예상 이동시간은 표시된 출발지와 도착지 구간의 값이며 전체 일정 시간과 구분합니다. 자동차는 제공처가 반환한 도로선을 표시하고, 대중교통의 정류장 연결 개요는 실제 도로선과 구분합니다. 도보·자전거 도로선은 WAVE 안에서 제공하지 않으며 외부 지도에서 별도로 확인합니다. 기차·버스 운행정보는 경로 전체의 연결과 탑승 가능 여부를 보장하지 않습니다.</p></section>
          <section><h3>편의정보 상태</h3><p>확인됨·미확인·없음으로 기록·제공처 오류를 구분합니다. 미확인은 시설이 없다는 뜻이 아니며, 후보를 일정에 담아도 미확인 편의가 확인됨으로 바뀌지 않습니다. 장소마다 현재 상태와 확인할 항목을 표시합니다.</p></section>
          <section><h3>반려동물·웰니스 정보</h3><p>반려동물 관광 목록은 동반 조건, 안내견 동반이나 무장애 편의를 확인한 결과가 아닙니다. 웰니스 분류는 치료 효과나 모든 이용자의 적합성을 보장하지 않습니다. 프로그램·예약·동반 조건은 운영기관에 확인해 주세요.</p></section>
        </div>
      </section>
      <section id="content-credits" className="content-credits">
        <h2>콘텐츠 출처 및 이용안내</h2><p>출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩. 관광정보·무장애 편의정보·축제 정보는 공공 관광 데이터를 연결해 제공합니다. 개별 사진의 저작자와 이용조건은 아래에서 확인할 수 있습니다.</p>
        <h3 id="horizon-photo-credits">소개 페이지의 풍경 사진</h3>
        <p>아래 사진은 Wikimedia Commons에 공개된 실제 관광 풍경입니다. 디자인 스튜디오에서 크기·압축을 조정한 파일을 사용하며, 화면 비율에 맞춰 잘라 표시합니다. 사진 위 글자를 읽기 쉽도록 명암·그라데이션을 사용하며, 카드에 초점을 두거나 마우스를 올리면 흐림 효과가 적용될 수 있습니다. 각 사진과 수정본은 표시된 동일조건변경허락 라이선스를 유지합니다.</p>
        <ul className="photo-credits-grid">{Object.values(horizonPhotos).map(photo => <li key={photo.id}><img src={photo.image} alt={photo.title} loading="lazy" width="240" height="160" /><a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.title} — 원본 및 저작자</a><p>제공: Wikimedia Commons · 저작자: {photo.photographer} · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a><br /><a href={photo.image}>현재 사용하는 사진 파일</a></p></li>)}</ul>
        <h3>지역별 관광사진</h3>
        <p>지역 사진의 제공기관은 한국관광공사이며 저작권은 해당 권리자에게 있습니다. 아래 링크는 현재 사용한 사진의 원본 이미지입니다. 개별 게시 상세 페이지와 사진별 이용조건의 일치는 아직 확인 중이며, 원본 링크를 이용허락 증빙으로 대신하지 않습니다. 재사용·재배포 전 제공처의 개별 이용조건을 확인해 주세요.</p>
        <ul id="regional-photo-credits" className="photo-credits-grid">{Object.entries(regionShowcaseAlbums).flatMap(([region,photos]) => photos.map(photo => <li key={photo.id}><img src={photo.image} alt={photo.title} loading="lazy" width="240" height="160" /><a href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">{region} · {photo.title} — 사진 원본 (새 탭)</a><p>저작자: {photo.photographer || "개별 저작자 미확인"} · 제공: ⓒ한국관광공사<br />원문 상세/개별 이용조건: 확인 중. 사진 내 워터마크를 유지합니다.</p></li>))}</ul>
        <PhotoCredits /><h3>지도 경계 자료</h3><p>통계청 SGIS 2020 행정경계를 StatGarten에서 단순화한 자료로, 지역 선택과 소개 지도에 사용합니다. 화면에 맞춰 색상과 크기를 조정했습니다. <a href="https://sgis.kostat.go.kr/" target="_blank" rel="noopener noreferrer">통계청 SGIS</a> · <a href="https://github.com/statgarten/maps" target="_blank" rel="noopener noreferrer">StatGarten 지도 자료</a></p>
        <h3>브랜드 이미지와 제품 화면</h3>
        <h3>지역 우선 보기 기준</h3><p><a href={decliningRegionNotice.sourceUrl} target="_blank" rel="noreferrer">{decliningRegionNotice.source}</a> · 지정일 {decliningRegionNotice.noticedOn} · 자료 확인 {decliningRegionNotice.checkedOn}</p><p>{decliningRegionNotice.regions.join(" · ")}</p>
        <p>나루 캐릭터와 나루·꼬마 여행자의 여행 배경은 WAVE의 안내를 위해 AI로 제작한 그림입니다. 실제 인물·관광지 사진이나 실제 상담 기록이 아닙니다. 대화 문구는 이용 방법을 보여주는 예시입니다.</p>
        <ul className="photo-credits-grid">{[
          { image: '/naru/night-journey-scene.webp', title: '나루와 꼬마 여행자의 밤 여행 배경 (AI 제작)' },
          { image: '/naru/naru-512.webp', title: '나루 캐릭터' },
          { image: '/naru/journey-preview-v3.webp', title: '나루와 꼬마여행자의 여행 준비 (AI 제작)' },
          { image: '/naru/wave-travel-story.webp', title: '함께 여행하는 WAVE 브랜드 일러스트' },
        ].map(art => <li key={art.image}><img src={art.image} alt={art.title} loading="lazy" width="240" height="160" /><strong>{art.title}</strong><p>제작: WAVE · AI 생성 이미지</p><a href={art.image}>현재 사용하는 이미지 파일</a></li>)}</ul>
        <p>보존된 인트로 브랜드 영상은 WAVE를 위해 제작한 이미지이며 실제 관광지·시설 기록이 아닙니다. 과거 소개에 사용한 생성 이미지, 추천 제품 화면, 편의 선택·커뮤니티 작성 시연은 원본과 사용 기록을 저장소에 보존합니다. 현재 소개의 풍경 사진은 위 저작자·이용조건을 따릅니다.</p>
        <p>보존된 일정·카카오 지도 화면은 2026년 9월 9일 06:55–06:58 KST 같은 여행에서 장소를 둘째 날로 옮긴 전후 기록입니다. 현재 소개에서는 보류 중이며, 지도 표기·워터마크와 원본 촬영 manifest를 보존합니다. 새 사용화면 검증 후 다시 제작합니다.</p>
      </section>
    </article>

    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">서비스 이용약관</Link></footer>
  </main>;
}
