import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { mapListItemToReport } from "../mappers/segnalazioni-ui-mapper";

export function useSegnalazioni() {
  const query = trpc.segnalazioni.list.useQuery({
    page: 1,
    pageSize: 50,
    sortBy: "createdAt",
    sortDirection: "desc",
  }, {
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

