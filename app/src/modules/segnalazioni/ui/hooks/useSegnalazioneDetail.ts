import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { mapDetailToReport } from "../mappers/segnalazioni-ui-mapper";

export function useSegnalazioneDetail(id?: string) {
  const query = trpc.segnalazioni.byId.useQuery(
    { id: id ?? "" },
    {
      enabled: Boolean(id),
      retry: false,
    },
  );

  const report = useMemo(
    () => query.data ? mapDetailToReport(query.data) : undefined,
    [query.data],
  );

  return {
    report,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

