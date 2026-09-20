export type RegionCulture = {
  region: string;
  title: string;
  summary: string;
  institution: string;
  url: string;
  checkedOn: string;
};

/**
 * 국가유산청 국가유산포털에서 소재지와 종목을 확인한 항목만 둔다.
 * 링크 소개만 제공하며 음원·영상 파일이나 재생 경로는 포함하지 않는다.
 */
export const regionCultures: readonly RegionCulture[] = [
  {
    region: "밀양",
    title: "밀양아리랑",
    summary: "밀양에 전승되는 경상남도 무형유산입니다.",
    institution: "국가유산청 국가유산포털",
    url: "https://heritage.go.kr/heri/cul/culSelectDetail.do?ccbaAsno=0000480000000&ccbaCpno=2223800480000&pageNo=1_1_1_1&sngl=Y",
    checkedOn: "2026-09-20",
  },
  {
    region: "진주",
    title: "진주검무",
    summary: "진주에 전승되는 국가무형유산 칼춤입니다.",
    institution: "국가유산청 국가유산포털",
    url: "https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800120000&pageNo=1_1_1_1",
    checkedOn: "2026-09-20",
  },
  {
    region: "통영",
    title: "통영오광대",
    summary: "통영에 전승되는 국가무형유산 탈놀음입니다.",
    institution: "국가유산청 국가유산포털",
    url: "https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800060000&pageNo=1_1_1_1",
    checkedOn: "2026-09-20",
  },
  {
    region: "고성",
    title: "고성오광대",
    summary: "고성에 전승되는 국가무형유산 탈놀음입니다.",
    institution: "국가유산청 국가유산포털",
    url: "https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800070000&pageNo=1_1_1_1",
    checkedOn: "2026-09-20",
  },
  {
    region: "사천",
    title: "진주삼천포농악",
    summary: "사천에 전승되는 국가무형유산 농악입니다.",
    institution: "국가유산청 국가유산포털",
    url: "https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800110100&pageNo=1_1_2_0",
    checkedOn: "2026-09-20",
  },
  {
    region: "거창",
    title: "거창삼베일소리",
    summary: "거창에 전승되는 경상남도 무형유산입니다.",
    institution: "국가유산청 국가유산포털",
    url: "https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=2223800170000&pageNo=1_1_2_0",
    checkedOn: "2026-09-20",
  },
];

export const regionCultureByName = new Map(regionCultures.map(item => [item.region, item]));
