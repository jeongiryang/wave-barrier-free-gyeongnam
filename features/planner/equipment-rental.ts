export type EquipmentRentalPlace = {
  id: string;
  name: string;
  region: string; // 경남 시군 이름
  items: string[]; // 대여 가능 품목. 기관이 밝힌 것만
  eligibility: string; // 이용 조건. 제한이 있으면 그대로 적는다
  hours?: string;
  phoneNumber?: string; // 확인된 번호만
  url?: string; // https 만 허용
  checkedOn: string; // 확인한 날짜
};

// human-gate: 명세 30(0단계) 기준, 경남 시군 보조기기 대여 기관의 이름·전화번호·
// 이용 조건·안내 링크는 저장소 책임자의 확인이 필요하다. 확인 전에는 이 배열을
// 비워 두고 목록을 그리지 않는다. 확인되지 않은 기관·번호를 임시로 적지 않는다.
// 조사한 후보와 출처는 docs/ai-logs/spec-30-equipment-rental.md에 기록했다.
export const equipmentRentalPlaces: readonly EquipmentRentalPlace[] = [];
