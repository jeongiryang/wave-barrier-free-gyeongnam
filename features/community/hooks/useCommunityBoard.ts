"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useHydratedSession } from "../../auth/hooks/useHydratedSession";
import { useCommunityPostList } from "./useCommunityPostList";

export type PlaceFilter = { id: string; name: string; region: string };

export function useCommunityBoard(initialPlace: PlaceFilter | null, sort = 'latest') {
  const { data: session } = useHydratedSession();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter | null>(initialPlace);
  const list = useCommunityPostList({ category, query, placeId: placeFilter?.id, sort });

  const writeHref = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (placeFilter) {
      params.set("placeId", placeFilter.id);
      params.set("placeName", placeFilter.name);
      if (placeFilter.region) params.set("region", placeFilter.region);
    }
    const target = `/community/new${params.size ? `?${params}` : ""}`;
    return session?.user ? target : `/login?next=${encodeURIComponent(target)}`;
  }, [category, placeFilter, session?.user]);
  const fieldReportWriteHref = useMemo(() => {
    if (!placeFilter) return "";
    const params = new URLSearchParams({ category: "field-report", placeId: placeFilter.id, placeName: placeFilter.name });
    if (placeFilter.region) params.set("region", placeFilter.region);
    const target = `/community/new?${params}`;
    return session?.user ? target : `/login?next=${encodeURIComponent(target)}`;
  }, [placeFilter, session?.user]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(search.trim());
  }

  return {
    ...list,
    category,
    setCategory,
    search,
    query,
    setQuery,
    setSearch,
    placeFilter,
    setPlaceFilter,
    writeHref,
    fieldReportWriteHref,
    submitSearch,
    resetSearch: () => { setSearch(""); setQuery(""); setCategory(""); },
  };
}
