export type PostValue = {
  category: string;
  title: string;
  content: string;
  region: string | null;
  placeId: string | null;
  placeName: string | null;
  visitDate: string | null;
  fieldReports: Array<{ field: string; status: string; note: string }>;
  journalPlaces: Array<{ id: string; name: string; day: string }>;
  visitPhotos?: Array<{ dataUrl: string; width: number; height: number; caption: string }>;
};

export type ListFilters = {
  history?: boolean;
  category: string;
  search: string;
  placeId: string;
  page: number;
  limit: number;
  offset: number;
};
