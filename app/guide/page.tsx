import Link from "next/link";
import TravelShell from "../../features/account-travel/TravelShell";
import { pageMetadata } from "../../lib/site-metadata";
export const metadata = pageMetadata({ title: "W.A.V.E 사용 방법", description: "여행 저장, 여러 기기에서 이어하기, 편의 조건과 동행자 초대 사용 방법을 알아보세요.", path: "/guide" });
export default function Page() {
  return <TravelShell title="여행을 잇는 방법">
    <nav className="travel-book-actions" aria-label="사용 방법 목차"><a href="#account-travel-guide">내 여행 저장</a><a href="#preferences">편의 조건</a><a href="#companions">동행자</a></nav>
    <section className="account-settings" id="account-travel-guide"><h2>01. 내 여행을 여러 기기에서 이어가기</h2><ol><li><Link href="/planner">여행 계획</Link>에서 지역·편의·활동·날짜를 고르고 장소를 일정에 담습니다.</li><li>일정의 <b>계정에 저장</b>을 누릅니다. 로그인 전에는 먼저 내 일정에 저장해 두고 로그인할 수 있습니다.</li><li><Link href="/my-trips">계정에 저장한 여행</Link>에서 여행을 열어 날짜·순서·메모를 바꾼 뒤 <b>변경 사항 저장</b>을 누릅니다.</li><li>다른 기기에서도 같은 카카오 또는 W.A.V.E 계정으로 로그인하면 저장한 여행이 보입니다.</li></ol><p>이미 보관한 일정은 <Link href="/travel-book">내 일정</Link>에서 골라 계정에 저장하세요. 기존 여행이 로그인만으로 자동 업로드되지는 않습니다.</p><p>다른 화면에서 동시에 편집하면 최신 버전을 확인하거나 내 수정본을 새 여행으로 보관할 수 있습니다. 오프라인에서 바꾼 내용은 연결이 돌아온 뒤 저장해 주세요. 저장 완료 안내 전에는 화면을 닫지 마세요.</p><p>계정에는 여행 20개, 여행당 장소 12곳·최대 7일을 보관합니다. 장소 이름과 편의시설 정보는 <b>장소 이름·최신 정보 확인</b>으로 다시 확인할 수 있습니다.</p></section>
    <section className="account-settings" id="preferences"><h2>02. 내가 고른 편의 조건 기억하기</h2><ol><li>여행 계획의 <b>편의 조건 저장·불러오기</b>를 펼칩니다.</li><li>현재 조건을 확인하고 <b>편의 조건을 계정에 저장</b>을 누릅니다.</li><li>다음 여행이나 다른 기기에서 <b>계정 편의 불러오기</b>를 누르면 선택이 적용됩니다.</li></ol><p>선택한 편의 조건만 저장하며 동행자에게 공유하지 않습니다. 저장을 원하지 않으면 이용하지 않아도 되고, <b>계정 편의 삭제</b>로 지울 수 있어요.</p></section>
    <section className="account-settings" id="companions"><h2>03. 동행자와 함께 계획하기</h2><ol><li>계정 여행을 열고 <b>초대 링크 만들기</b>를 누릅니다.</li><li>복사한 링크를 원하는 동행자에게 전달합니다. 초대는 7일 동안 유효합니다.</li><li>동행자는 로그인하고 표시 이름을 입력한 뒤 <b>여행에 참여하기</b>를 누릅니다.</li><li>장소의 <b>가고 싶어요</b>로 투표하고 <b>의견 남기기</b>로 준비할 내용을 나눕니다. 여행을 만든 사람이 의견을 보고 최종 일정을 수정합니다.</li></ol><p>한 여행에 만든 사람 포함 최대 10명이 참여할 수 있습니다. <b>초대 중지</b>는 새 참여를 막고, 참여 해제는 해당 동행자의 접근·투표·의견을 삭제합니다. 링크는 함께할 사람에게만 전달해 주세요.</p></section>
  </TravelShell>;
}
