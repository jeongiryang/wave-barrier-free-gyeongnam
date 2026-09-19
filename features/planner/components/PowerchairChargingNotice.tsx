import { POWERCHAIR_CHARGING_NOTICE_TEXT, POWERCHAIR_CHARGING_OFFICIAL_LINKS } from '../../../lib/powerchair-charging-links.js';

/**
 * 전동휠체어 충전 장소 대체 안내(스펙 15).
 *
 * 공공데이터포털에 실제 호출로 확인 가능한 경남 표본이 없어(환경에 공공데이터
 * 키가 없어 호출 자체를 하지 못했다) 지도 레이어나 설치 장소 목록을 만들지
 * 않는다. 대신 경남 18개 시군의 공식 누리집 링크만 정적으로 보여준다.
 * 네트워크 호출을 하지 않는 순수 정적 컴포넌트다.
 */
export default function PowerchairChargingNotice() {
  return <div className="place-inquiry-entry">
    <div>
      <h3>전동휠체어 충전 안내</h3>
      <p>{POWERCHAIR_CHARGING_NOTICE_TEXT}</p>
    </div>
    <details>
      <summary>시군별 공식 누리집 보기</summary>
      <ul>
        {POWERCHAIR_CHARGING_OFFICIAL_LINKS.map(link => <li key={link.region}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">{link.region} · {link.name} ↗</a>
        </li>)}
      </ul>
      <p><small>공공데이터포털에 경남 표본을 실제 호출로 확인하지 못해 설치 장소 목록 대신 관할 기관 안내로 대체했어요. 아래 링크는 2026-09-19에 접속을 확인했어요.</small></p>
    </details>
  </div>;
}
