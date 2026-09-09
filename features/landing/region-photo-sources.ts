import type { RegionPhoto } from "./content";
/** No guessed photo detail IDs. Gallery IDs differ from TourAPI content IDs.
 * Until an exact image/detail match is verified, use the original KTO image URL
 * and label it explicitly. See docs/design/region-photo-source-register.md.
 */
export function regionPhotoSource(photo: RegionPhoto) {
  return { href: photo.image, kind: "original-image" as const, verifiedDetail: false };
}
