export const nearbyCategories = [
  { id: "food", label: "음식점", icon: "🍴", code: "FD6" },
  { id: "stay", label: "숙박", icon: "🛏", code: "AD5" },
  { id: "attraction", label: "관광명소", icon: "✦", code: "AT4" },
  { id: "bus", label: "버스", icon: "▣", keyword: "버스정류장" },
  { id: "subway", label: "지하철", icon: "▤", code: "SW8" },
  { id: "parking", label: "주차장", icon: "P", code: "PK6" },
  { id: "pharmacy", label: "약국", icon: "✚", code: "PM9" },
  { id: "hospital", label: "병원", icon: "H", code: "HP8" },
  { id: "bank", label: "은행·ATM", icon: "₩", code: "BK9" },
  { id: "cafe", label: "카페", icon: "☕", code: "CE7" },
  { id: "store", label: "편의점", icon: "24", code: "CS2" },
  { id: "mart", label: "대형마트", icon: "▦", code: "MT1" },
  { id: "fuel", label: "주유·충전", icon: "⛽", code: "OL7" },
  { id: "culture", label: "문화시설", icon: "▥", code: "CT1" },
] as const;

export const overlayLayers = [
  { id: "TRAFFIC", label: "교통정보", icon: "🚦" },
  { id: "BICYCLE", label: "자전거", icon: "🚲" },
  { id: "TERRAIN", label: "지형도", icon: "⛰" },
  { id: "USE_DISTRICT", label: "지적편집도", icon: "◇" },
] as const;
