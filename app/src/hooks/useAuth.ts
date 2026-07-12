import { clearTrpcQueryCache, trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { LOGIN_PATH } from "@/const";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const location = useLocation();

  const utils = trpc.useUtils();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onMutate: async () => {
      await utils.auth.me.cancel();
      utils.auth.me.setData(undefined, undefined);
    },
    onSettled: () => {
      clearTrpcQueryCache();
      navigate(redirectPath, { replace: true });
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath, location.pathname]);

  return useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      error,
      logout,
      refresh: refetch,
    }),
    [user, isLoading, logoutMutation.isPending, error, logout, refetch],
  );
}
