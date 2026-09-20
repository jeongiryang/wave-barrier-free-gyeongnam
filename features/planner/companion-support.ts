export type CompanionSupportProgram = {
  id: string;
  name: string;
  institution: string;
  howToApply: string;
  url: string;
  noticeDays?: string;
  checkedOn: string;
};

// human-gate: 제도 이름·공식 링크·신청 방법은 저장소 책임자가 여행 목적 이용
// 가능 여부까지 확인한 뒤에만 추가한다. 현재 확인된 후보인 장애인 활동지원은
// 공식 안내에서 여행 목적 이용 가능 여부를 확인하지 못했으므로 넣지 않는다.
export const companionSupportPrograms: readonly CompanionSupportProgram[] = [];
