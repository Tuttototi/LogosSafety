import { LOGIN_PATH } from "@/const";
import {
  canAccessModule,
  getAuthorizedHomePath,
  type AccessActor,
  type ModuleAccessId,
} from "@/lib/module-access";

export const PUBLIC_AUTH_ROUTES = [LOGIN_PATH] as const;

export type AuthRouteDecision =
  | { state: "loading" }
  | { state: "allow" }
  | { state: "redirect"; to: string }
  | { state: "forbidden" };

export function getPostLoginRedirectPath(role?: string | null): string {
  return getAuthorizedHomePath({ role });
}

export function getDevLoginRedirectHash(role?: string | null): string {
  return `/#${getPostLoginRedirectPath(role)}`;
}

export function getProtectedRouteDecision(options: {
  isLoading: boolean;
  isAuthenticated: boolean;
  role?: string | null;
  permissions?: readonly string[] | null;
  moduleId?: ModuleAccessId;
}): AuthRouteDecision {
  if (options.isLoading) {
    return { state: "loading" };
  }

  if (!options.isAuthenticated) {
    return { state: "redirect", to: LOGIN_PATH };
  }

  if (options.moduleId) {
    const actor: AccessActor = {
      role: options.role,
      permissions: options.permissions,
    };

    if (!canAccessModule(actor, options.moduleId)) {
      if (options.role === "segnalatore" && options.moduleId !== "reportsSafetyApp") {
        return { state: "redirect", to: getPostLoginRedirectPath(options.role) };
      }

      return { state: "forbidden" };
    }
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
