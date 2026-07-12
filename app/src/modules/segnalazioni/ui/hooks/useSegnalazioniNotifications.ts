import { trpc } from "@/providers/trpc";

export function useSegnalazioniNotifications() {
  const query = trpc.segnalazioni.notifications.useQuery(undefined, {
    retry: false,
  });

  return {
    notifications: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    source: query.data?.source,
    readState: query.data?.readState,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
