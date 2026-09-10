import type { RichMode } from "./types";

export const themeExplorerEnglish: Record<RichMode, { label: string; description: string }> = {
  events: { label: "Festivals & events", description: "What's happening locally" },
  lodging: { label: "Places to stay", description: "Accommodation in the region" },
  wellness: { label: "Wellness", description: "Nature, rest and reflection" },
  camping: { label: "Camping", description: "Campsites and outdoor stays" },
  pet: { label: "With pets", description: "Travel with your companion" },
  water: { label: "By the water", description: "Rivers and waterside places" },
  medical: { label: "Medical tourism", description: "Health and recovery" },
  awards: { label: "Travel photography", description: "Scenes across the seasons" },
  language: { label: "Tourism in your language", description: "Regional travel information" },
  rests: { label: "Themed rest stops", description: "Places along the highway" },
};
