const conditions: Array<[number[], string]> = [
  [[0], "Clear"], [[1, 2], "Mostly clear"], [[3], "Cloudy"], [[45, 48], "Fog"],
  [[51, 53, 55, 56, 57], "Drizzle"], [[61, 63, 65, 66, 67, 80, 81, 82], "Rain"],
  [[71, 73, 75, 77, 85, 86], "Snow"], [[95, 96, 99], "Thunderstorms"],
];

export function weatherCondition(code: number, original: string, english: boolean) {
  return english ? conditions.find(([codes]) => codes.includes(code))?.[1] || "Weather condition unknown" : original;
}

const advice: Record<string, string> = {
  "우산과 미끄럼 방지 신발을 챙기세요.": "Bring an umbrella and shoes with good grip.",
  "눈 예보가 있어 방수 신발과 보온 장갑이 좋아요.": "Snow is forecast. Bring waterproof shoes and warm gloves.",
  "자외선이 강해 선크림·모자·선글라스를 권해요.": "Strong UV is forecast. Consider sunscreen, a hat and sunglasses.",
  "패딩과 보온 내의를 준비하세요.": "Bring a warm coat and thermal layers.",
  "아침저녁 외투나 얇은 패딩이 필요해요.": "Bring a jacket for cooler mornings and evenings.",
  "통풍이 잘되는 얇은 옷과 물을 챙기세요.": "Bring breathable clothing and drinking water.",
  "가벼운 겉옷을 겹쳐 입으면 편안해요.": "Bring a light outer layer.",
};
export const weatherPreparation = (text: string, english: boolean) => english ? advice[text] || text : text;
