import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { mapListItemToReport } from "../mappers/segnalazioni-ui-mapper";
import type { SegnalazioniListFilters } from "../types";

export function useSegnalazioni(filters: SegnalazioniListFilters = {}) {
  const queryInput = useMemo(() => ({
    page: 1,
    pageSize: 50,
    sortBy: "createdAt" as const,
    sortDirection: "desc" as const,
    ...filters,
  }), [filters]);

  const query = trpc.segnalazioni.list.useQuery(queryInput, {
    retry: false,
  });

  const reports = useMemo(
    () => (query.data?.items ?? []).map(mapListItemToReport),
    [query.data?.items],
  );

  return {
    reports,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
