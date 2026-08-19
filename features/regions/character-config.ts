export type RegionMotif = "stage" | "film" | "reed" | "music" | "mountain" | "sprout" | "herb" | "shield" | "spark" | "pottery" | "flower" | "tea" | "lantern" | "plane" | "dino" | "village" | "sail" | "island";

export const regionCharacters: Record<string, { primary: string; accent: string; motif: RegionMotif; nickname: string }> = {
  거창: { primary: "#7657d6", accent: "#f6c85f", motif: "stage", nickname: "무대별" },
  합천: { primary: "#7552a8", accent: "#8de1ff", motif: "film", nickname: "필름별" },
  창녕: { primary: "#4f9a73", accent: "#f7cf5b", motif: "reed", nickname: "우포새" },
  밀양: { primary: "#7f5cc9", accent: "#ffb7d5", motif: "music", nickname: "아리별" },
  양산: { primary: "#397d8e", accent: "#a9ead4", motif: "mountain", nickname: "산마루" },
  함양: { primary: "#3f9270", accent: "#d6ea75", motif: "sprout", nickname: "새싹이" },
  산청: { primary: "#2f8c75", accent: "#8fe3aa", motif: "herb", nickname: "약초롱" },
  의령: { primary: "#b04f5d", accent: "#ffd36d", motif: "shield", nickname: "의병이" },
  함안: { primary: "#c45d4e", accent: "#ffc459", motif: "spark", nickname: "낙화콩" },
  김해: { primary: "#9a6845", accent: "#78d9dc", motif: "pottery", nickname: "가야토" },
  창원: { primary: "#e06c9f", accent: "#ffd2e7", motif: "flower", nickname: "벚길이" },
  하동: { primary: "#438b67", accent: "#b8e77c", motif: "tea", nickname: "차오름" },
  진주: { primary: "#d77454", accent: "#ffe08a", motif: "lantern", nickname: "유등이" },
  사천: { primary: "#397dbb", accent: "#b9edff", motif: "plane", nickname: "하늘이" },
  고성: { primary: "#4f8f78", accent: "#ffcf71", motif: "dino", nickname: "발자국" },
  남해: { primary: "#2f8ea0", accent: "#ffb86c", motif: "village", nickname: "다랭이" },
  통영: { primary: "#277ea3", accent: "#f2d16b", motif: "sail", nickname: "미륵이" },
  거제: { primary: "#347f9f", accent: "#f3a9c9", motif: "island", nickname: "섬바람" },
};

export const regionMascotNames = Object.freeze(Object.keys(regionCharacters));
