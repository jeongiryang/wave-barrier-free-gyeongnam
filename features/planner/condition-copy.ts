export const englishProfiles: Record<string, { label: string; short: string }> = {
  wheel: { label: "Wheelchair facilities", short: "Parking, access, rental, lifts and toilets" },
  senior: { label: "Access paths and lifts", short: "Access paths, lifts and accessible toilets" },
  baby: { label: "Facilities for young children", short: "Strollers, nursing rooms and high chairs" },
  pregnant: { label: "Toilets and indoor access", short: "Accessible toilets, lifts and access paths" },
  visual: { label: "Visual information support", short: "Braille and audio guidance" },
  hearing: { label: "Hearing information support", short: "Sign language and video guidance" },
};

export const englishThemes: Record<string, { label: string; description: string }> = {
  nature: { label: "Nature and relaxation", description: "Parks, gardens and natural attractions" },
  history: { label: "History and culture", description: "Museums, exhibitions and cultural spaces" },
  leisure: { label: "Recreation", description: "Experiences and outdoor activities" },
  food: { label: "Food", description: "Local food and restaurants" },
};

export const profileNotices = {
  none: ["", ""],
  damaged: ["저장한 편의 조건이 손상되어 적용하지 않았습니다. 현재 선택은 그대로 유지됩니다.", "The saved facilities are damaged and were not applied. Your current choices are unchanged."],
  unreadable: ["저장한 편의 조건을 읽지 못했습니다. 현재 선택은 그대로 유지됩니다.", "We couldn't read the saved facilities. Your current choices are unchanged."],
  empty: ["저장할 편의조건을 하나 이상 선택해 주세요.", "Select at least one facility to save."],
  saved: ["편의 조건을 저장했습니다.", "Your facilities were saved."],
  unsaved: ["편의 조건을 저장하지 못했어요. 현재 선택은 계속 사용할 수 있습니다.", "Could not save your facilities. You can keep using your current choices."],
  deleted: ["저장한 편의 조건을 삭제했습니다.", "Your saved facilities were deleted."],
  undeleted: ["저장한 편의 조건을 삭제하지 못했습니다. 저장 공간과 권한을 확인해 주세요.", "We couldn't delete the saved facilities. Check storage space and permissions."],
  applied: ["저장된 편의조건을 현재 여행 설계에 적용했습니다.", "The saved facilities were applied to this trip."],
} as const;

export const planNotices = {
  outsideTrip: ["이 장소는 현재 여행 기간 밖에 보관되어 있습니다. 일정에서 날짜를 먼저 옮겨주세요.", "This place is stored outside the trip dates. Move it into this trip first."],
  replaced: ["선택한 장소로 바꿨어요. 갱신된 일정과 경로를 확인해 주세요.", "Place replaced. Check the updated itinerary and route."],
  idle: ["바로 여행지를 둘러보거나, 필요한 조건만 골라주세요.", "Browse places now, or choose only the conditions you need."],
  loading: ["필요한 편의가 확인된 여행지를 찾고 있어요.", "Finding places with information about your needs."],
  updated: ["공식 관광정보를 확인해 추천을 업데이트했습니다.", "Recommendations were updated using official tourism information."],
  empty: ["공식 데이터에서 현재 조건에 맞는 결과를 확인하지 못했습니다.", "No official results were found for your current choices. Change your choices and try again."],
  offline: ["인터넷 연결이 끊겼어요. 기존 일정은 계속 확인할 수 있습니다.", "You are offline. You can still view your existing itinerary."],
  error: ["여행지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.", "We couldn't load places. Your choices are kept. Please try again shortly."],
} as const;

export const planFailureHeadings = {
  timeout: ["조회 시간이 초과됐어요.", "The request timed out."],
  server: ["서버가 요청을 처리하지 못했어요.", "The server couldn't complete the request."],
  offline: ["인터넷 연결이 끊겼어요.", "You are offline."],
  error: ["여행지를 불러오지 못했어요.", "We couldn't load places."],
} as const;
