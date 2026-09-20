"use client";

import { useCallback, useState } from "react";
import type { Place } from "../planner/types";
import { usePlaceDialogFocus } from "../planner/hooks/usePlaceDialogFocus";
import styles from "./FestivalAmenities.module.css";

function FestivalAmenityMap() {
  return <section className={styles.panel} aria-label="현장 편의시설 확인 상태">
    <h3>현장 편의시설 위치정보 없음</h3>
    <p role="status">이 축제의 쉬는 곳과 화장실 위치를 확인할 수 있는 공식 현장 지도가 아직 제공되지 않았어요.</p>
    <p>방문 전 축제 주최 측에 편의시설 위치와 이용 가능 여부를 확인해 주세요.</p>
  </section>;
}

export default function FestivalAmenities({ place }: { place: Place }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>지금 현장·감각 정보</button>
    {open && <FestivalAmenityDialog place={place} onClose={close} />}
  </>;
}

function FestivalAmenityDialog({ place, onClose }: { place: Place; onClose: () => void }) {
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={`festival-amenity-title-${place.id}`} data-testid="festival-amenity-dialog">
    <header className={styles.dialogHeader}>
      <h2 id={`festival-amenity-title-${place.id}`} tabIndex={-1}>{place.name} 현장 편의 지도</h2>
      <button type="button" aria-label="현장 편의 지도 닫기" onClick={onClose}>×</button>
    </header>
    <FestivalAmenityMap />
  </dialog>;
}
