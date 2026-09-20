export type RegionSound = {
  id: string;
  title: string;
  credit: string;
  license: string;
  licenseUrl: string;
  src: string;
  seconds: number;
  checkedOn: string;
};

// Publishing an audio file requires the repository owner's explicit licence
// review. No candidate has completed that human gate, so the public registry
// intentionally remains empty and the player renders nothing.
export const regionSounds: readonly RegionSound[] = [];
