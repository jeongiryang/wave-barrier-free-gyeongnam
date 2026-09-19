'use client';
import { useEffect, useState } from 'react';
import type { Place } from '../types';
import { groupStayFacilities } from '../../../lib/stay-facility.js';
import { accessibilityFieldState } from '../../../lib/accessibility-score.js';
import type { VisitInfo } from '../../../lib/visit-hours.js';
import { fetchVisitInfo } from '../services/visit-info';

/**
 * 숙소 편의시설 표시(스펙 48).
 *
 * 새 제공처, 새 서버 action, 새 환경 변수를 쓰지 않는다. 이미 있는
 * `visit-info`(체크인·체크아웃)와 장소 조회 응답(`place.accessibility`)만
 * 읽어 `groupStayFacilities`로 세 묶음(들어가기/객실과 욕실/머무는 동안)으로
 * 나눈다. 응답은 화면 안 메모리에만 두고 `localStorage`나 계정 API에 복제하지
 * 않는다.
 *
 * 값이 하나도 확인되지 않은 묶음은 그리지 않는다. 세 묶음이 모두 비면 안내
 * 문구와 문의 링크만 보여준다. 세 상태(confirmed/negative/unknown)는 항상
 * 문구로 구분하고, 미확인을 없음으로 표시하지 않는다.
 */
const stateText = (state: string) =>
  state === 'confirmed' ? '정보 있음' : state === 'negative' ? '이용 조건 확인' : '미확인';

export default function StayFacilityDetail({ place }: { place: Place }) {
  const [visitInfo, setVisitInfo] = useState<VisitInfo | null>(null);
  useEffect(() => {
    let active = true;
    fetchVisitInfo(place.id).then((info) => { if (active) setVisitInfo(info); }).catch(() => {});
    return () => { active = false; };
  }, [place.id]);

  if (place.contentTypeId !== '32') return null;

  const stayItems = visitInfo && visitInfo.status === 'available'
    ? [
        { key: 'checkIn', label: '입실 시간', state: accessibilityFieldState(visitInfo.checkIn), detail: visitInfo.checkIn || '' },
        { key: 'checkOut', label: '퇴실 시간', state: accessibilityFieldState(visitInfo.checkOut), detail: visitInfo.checkOut || '' },
      ]
    : [];
  const groups = groupStayFacilities([...(place.accessibility || []), ...stayItems]);

  if (groups.length === 0) return <section className="stay-facility-detail" aria-label={`${place.name} 숙소 편의시설`}>
    <p>등록된 시설 정보가 없어요.</p>
  </section>;

  return <section className="stay-facility-detail" aria-label={`${place.name} 숙소 편의시설`}>
    {groups.map((group) => <section key={group.id}>
      <h4>{group.title}</h4>
      <ul>
        {group.items.map((item) => <li key={item.key}>
          <span className="access-badge">{item.label}: {stateText(item.state)}</span>
          {item.detail ? <p style={{ margin: '4px 0 0' }}>{item.detail}</p> : null}
        </li>)}
      </ul>
    </section>)}
    <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>객실마다 시설이 다를 수 있어요. 예약 전에 숙소에 직접 확인하는 것이 확실해요.</p>
  </section>;
}
