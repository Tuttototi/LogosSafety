import { LOGIN_PATH } from "@/const";

export const PUBLIC_AUTH_ROUTES = [LOGIN_PATH] as const;

export type AuthRouteDecision =
  | { state: "loading" }
  | { state: "allow" }
  | { state: "redirect"; to: string };

const SAFETY_APP_ROLES = new Set([
  "segnalatore",
  "dipendente",
  "operatore",
  "capo_impianto",
]);

export function getPostLoginRedirectPath(role?: string | null): string {
  if (role && SAFETY_APP_ROLES.has(role)) {
    return "/segnalazioni/app";
  }

  return "/segnalazioni";
}

export function getDevLoginRedirectHash(role?: string | null): string {
  return `/#${getPostLoginRedirectPath(role)}`;
}

export function getProtectedRouteDecision(options: {
  isLoading: boolean;
  isAuthenticated: boolean;
}): AuthRouteDecision {
  if (options.isLoading) {
    return { state: "loading" };
  }

  if (!options.isAuthenticated) {
    return { state: "redirect", to: LOGIN_PATH };
  }

  return { state: "allow" };
}

export function getPublicRouteDecision(options: {
  isLoading: boolean;
  role?: string | null;
}): AuthRouteDecision {
  if (options.isLoading) {
    return { state: "loading" };
  }

  if (options.role) {
    return { state: "redirect", to: getPostLoginRedirectPath(options.role) };
  }

  return { state: "allow" };
}
