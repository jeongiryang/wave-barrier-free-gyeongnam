import type { RegionPhoto } from "./content";

export type EditorialSource = RegionPhoto & { sourceUrl?: string; license?: string; licenseUrl?: string };
// Existing Owner reference derivatives, copied unchanged; screen crops vary by viewport.
// Original authors/licenses verified on Wikimedia Commons on 2026-09-11.
export const horizonPhotos = {
  coast: { id: "horizon-coast", title: "통영 · 한려해상", image: "/media/horizon/hero-coast.jpg", photographer: "Junho Jung", location: "경상남도 통영시", month: "200905", sourceUrl: "https://commons.wikimedia.org/wiki/File:Korea-Tongyeong-Hallyeo_National_Marine_Park-01.jpg", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/" },
  park: { id: "horizon-park", title: "통영 · 이순신공원", image: "/media/horizon/coastal-park.jpg", photographer: "Grampus", location: "경상남도 통영시", month: "201502", sourceUrl: "https://commons.wikimedia.org/wiki/File:Yi_Sun-Sin_Park_02.JPG", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" },
  garden: { id: "horizon-garden", title: "거제 · 외도 보타니아", image: "/media/horizon/botanical-garden.jpg", photographer: "Yoo Chung", location: "경상남도 거제시", month: "200603", sourceUrl: "https://commons.wikimedia.org/wiki/File:Botanical_garden_at_Oedo.jpg", license: "CC BY-SA 2.5", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.5/" },
} satisfies Record<string, EditorialSource>;
