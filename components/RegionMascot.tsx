import type { CSSProperties } from "react";

type Motif = "stage" | "film" | "reed" | "music" | "mountain" | "sprout" | "herb" | "shield" | "spark" | "pottery" | "flower" | "tea" | "lantern" | "plane" | "dino" | "village" | "sail" | "island";

const regionCharacters: Record<string, { primary: string; accent: string; motif: Motif; nickname: string }> = {
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

function MotifMark({ motif, accent }: { motif: Motif; accent: string }) {
  const common = { fill: accent, stroke: "#fff", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (motif) {
    case "stage": return <g {...common}><path d="M23 17c3-5 8-5 10 0-2 5-8 5-10 0Z" /><circle cx="26" cy="16" r=".8" fill="#17384a" stroke="none" /><circle cx="30" cy="16" r=".8" fill="#17384a" stroke="none" /></g>;
    case "film": return <g {...common}><rect x="23" y="13" width="11" height="8" rx="2" /><path d="m24 13 2-3 3 3 2-3 3 3" fill="none" /></g>;
    case "reed": return <g {...common} fill="none"><path d="M28 22V11m0 4-4-3m4 7 5-4" /><path d="M23 12c0-3 3-4 5-1-1 2-3 3-5 1Zm10 3c1-3-2-5-4-2 0 2 2 3 4 2Z" /></g>;
    case "music": return <g {...common}><path d="M27 11v9m0-7 7-2v7" fill="none" /><circle cx="24.5" cy="20" r="2.5" /><circle cx="31.5" cy="18" r="2.5" /></g>;
    case "mountain": return <g {...common}><path d="m21 21 7-11 5 7 3-4 5 8Z" /><path d="m26 13 2 3 2-2" fill="none" /></g>;
    case "sprout": return <g {...common}><path d="M30 22v-9" fill="none" /><path d="M30 16c-6 0-7-5-3-7 3 1 4 4 3 7Zm0 3c6 0 8-5 4-8-3 1-5 4-4 8Z" /></g>;
    case "herb": return <g {...common}><path d="M23 20c7 1 12-3 13-10-8 0-13 4-13 10Z" /><path d="m25 18 8-6" fill="none" /></g>;
    case "shield": return <g {...common}><path d="M28 9 36 12v5c0 5-4 8-8 10-4-2-8-5-8-10v-5Z" /><path d="m28 13 3 4-3 5" fill="none" /></g>;
    case "spark": return <g {...common}><path d="M28 8c6 7 6 11 1 15-5-2-7-7-3-12 0 4 3 4 2-3Z" /></g>;
    case "pottery": return <g {...common}><path d="M24 11h9c-2 4-1 5 2 8-1 5-11 5-12 0 3-3 3-4 1-8Z" /><path d="M25 17h8" fill="none" /></g>;
    case "flower": return <g {...common}><circle cx="29" cy="15" r="3" /><circle cx="24" cy="15" r="3" /><circle cx="26.5" cy="11" r="3" /><circle cx="26.5" cy="19" r="3" /><circle cx="26.5" cy="15" r="2" fill="#fff" /></g>;
    case "tea": return <g {...common}><path d="M22 14h12v5c0 5-10 5-10 0v-5" /><path d="M34 15h2c4 0 3 5-1 5M25 11c-2-2 2-3 0-5m5 5c-2-2 2-3 0-5" fill="none" /></g>;
    case "lantern": return <g {...common}><path d="M24 12h9l2 4-2 6h-9l-2-6Z" /><path d="M26 9h5m-3 13v3" fill="none" /></g>;
    case "plane": return <g {...common}><path d="m19 17 8-2 4-7 3 1-2 7 6 3-1 2-7-1-4 4-2-1 2-4-7 1Z" /></g>;
    case "dino": return <g {...common}><ellipse cx="28" cy="16" rx="4" ry="6" /><circle cx="22" cy="11" r="2" /><circle cx="35" cy="12" r="2.3" /><circle cx="36" cy="20" r="2" /></g>;
    case "village": return <g {...common}><path d="m20 17 6-5 6 5v6H20Zm11-1 5-4 5 4v7h-9" /><path d="M24 23v-4h4v4" fill="none" /></g>;
    case "sail": return <g {...common}><path d="M29 9v14m0-12-8 9h8Zm2 2 7 7h-7Z" /><path d="M20 24h19" fill="none" /></g>;
    case "island": return <g {...common}><path d="M20 21c5-4 13-4 18 0-5 4-13 4-18 0Z" /><path d="M29 18c-1-5 2-8 6-9-1 4-3 7-6 9Zm0-1c0-4-3-6-6-6 1 3 3 5 6 6Z" /></g>;
  }
}

export function RegionMascot({ region, size = 42, labelled = false }: { region: string; size?: number; labelled?: boolean }) {
  const character = regionCharacters[region] ?? { primary: "#277ea3", accent: "#7debe9", motif: "island" as const, nickname: "웨이비" };
  const style = { "--mascot-primary": character.primary, "--mascot-accent": character.accent } as CSSProperties;
  return (
    <svg className="region-mascot" data-region={region} style={style} width={size} height={size} viewBox="0 0 64 64" role={labelled ? "img" : undefined} aria-hidden={labelled ? undefined : true}>
      {labelled && <title>{region} 여행 친구 {character.nickname}</title>}
      <ellipse cx="32" cy="57" rx="17" ry="4" fill="rgba(3,38,54,.16)" />
      <path d="M13 39c0-15 8-24 19-24s19 9 19 24c0 13-8 20-19 20s-19-7-19-20Z" fill="var(--mascot-primary)" stroke="rgba(255,255,255,.9)" strokeWidth="2" />
      <path d="M15 39c5 3 11 4 17 4s12-1 17-4c-1 12-8 18-17 18s-16-6-17-18Z" fill="var(--mascot-accent)" opacity=".86" />
      <MotifMark motif={character.motif} accent={character.accent} />
      <circle cx="25" cy="35" r="2.1" fill="#082f42" />
      <circle cx="39" cy="35" r="2.1" fill="#082f42" />
      <circle cx="24.3" cy="34.3" r=".65" fill="#fff" />
      <circle cx="38.3" cy="34.3" r=".65" fill="#fff" />
      <path d="M27 40c3 3 7 3 10 0" fill="none" stroke="#082f42" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20.5" cy="39.5" r="2" fill="#ffabc2" opacity=".55" />
      <circle cx="43.5" cy="39.5" r="2" fill="#ffabc2" opacity=".55" />
      <path d="M15 43c-4 0-6 3-6 6m40-6c4 0 6 3 6 6" fill="none" stroke="var(--mascot-primary)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export const regionMascotNames = Object.freeze(Object.keys(regionCharacters));
