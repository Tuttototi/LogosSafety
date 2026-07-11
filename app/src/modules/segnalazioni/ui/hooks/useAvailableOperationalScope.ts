import { trpc } from "@/providers/trpc";

export function useAvailableOperationalScope() {
  const query = trpc.segnalazioni.availableScope.useQuery(undefined, {
    retry: false,
  });

  return {
    scope: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
