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
};

export type ListFilters = {
  category: string;
  search: string;
  placeId: string;
  page: number;
  limit: number;
  offset: number;
};
