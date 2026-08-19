export type PostValue = {
  category: string;
  title: string;
  content: string;
  region: string | null;
  placeId: string | null;
  placeName: string | null;
};

export type ListFilters = {
  category: string;
  search: string;
  placeId: string;
  page: number;
  limit: number;
  offset: number;
};
