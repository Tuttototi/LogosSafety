import { describe, expect, it } from "vitest";
import {
  getDevLoginRedirectHash,
  getPostLoginRedirectPath,
  getProtectedRouteDecision,
  getPublicRouteDecision,
} from "@/lib/auth-routing";

describe("auth route guard decisions", () => {
  it("redirects root access without auth to login", () => {
    expect(getProtectedRouteDecision({
      isAuthenticated: false,
      isLoading: false,
    })).toEqual({ state: "redirect", to: "/login" });
  });

  it("redirects protected routes without auth to login", () => {
    expect(getProtectedRouteDecision({
      isAuthenticated: false,
      isLoading: false,
    })).toEqual({ state: "redirect", to: "/login" });
  });

  it("does not render protected content while auth is loading", () => {
    expect(getProtectedRouteDecision({
      isAuthenticated: false,
      isLoading: true,
    })).toEqual({ state: "loading" });
  });

  it("allows protected content only with a valid session", () => {
    expect(getProtectedRouteDecision({
      isAuthenticated: true,
      isLoading: false,
    })).toEqual({ state: "allow" });
  });

  it("keeps login public for unauthenticated users", () => {
    expect(getPublicRouteDecision({
      isLoading: false,
      role: null,
    })).toEqual({ state: "allow" });
  });

  it("redirects authenticated users away from login by role", () => {
    expect(getPublicRouteDecision({
      isLoading: false,
      role: "admin",
    })).toEqual({ state: "redirect", to: "/segnalazioni" });
    expect(getPublicRouteDecision({
      isLoading: false,
      role: "segnalatore",
    })).toEqual({ state: "redirect", to: "/segnalazioni/app" });
  });

  it("builds UAT login redirect hashes without trusting client role data", () => {
    expect(getPostLoginRedirectPath("admin")).toBe("/segnalazioni");
    expect(getPostLoginRedirectPath("segnalatore")).toBe("/segnalazioni/app");
    expect(getPostLoginRedirectPath("dipendente")).toBe("/segnalazioni/app");
    expect(getPostLoginRedirectPath("operatore")).toBe("/segnalazioni/app");
    expect(getPostLoginRedirectPath("capo_impianto")).toBe("/segnalazioni/app");
    expect(getDevLoginRedirectHash("admin")).toBe("/#/segnalazioni");
    expect(getDevLoginRedirectHash("segnalatore")).toBe("/#/segnalazioni/app");
  });
});
