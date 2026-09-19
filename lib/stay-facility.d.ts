export type StayFacilityGroup = {
  id: "entry" | "room" | "stay";
  title: string;
  items: { key: string; label: string; state: "confirmed" | "unknown" | "negative"; detail?: string }[];
};

export function groupStayFacilities(
  items: { key: string; label: string; state: string; detail?: string }[],
): StayFacilityGroup[];
