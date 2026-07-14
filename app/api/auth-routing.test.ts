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
    })).toEqual({ state: "redirect", to: "/" });
    expect(getPublicRouteDecision({
      isLoading: false,
      role: "segnalatore",
    })).toEqual({ state: "redirect", to: "/segnalazioni/app" });
  });

  it("builds UAT login redirect hashes without trusting client role data", () => {
    expect(getPostLoginRedirectPath("admin")).toBe("/");
    expect(getPostLoginRedirectPath("rspp")).toBe("/");
    expect(getPostLoginRedirectPath("aspp")).toBe("/");
    expect(getPostLoginRedirectPath("responsabile_sicurezza")).toBe("/");
    expect(getPostLoginRedirectPath("operatore_sicurezza")).toBe("/");
    expect(getPostLoginRedirectPath("capo_area")).toBe("/");
    expect(getPostLoginRedirectPath("capo_impianto")).toBe("/");
    expect(getPostLoginRedirectPath("referente_commessa")).toBe("/");
    expect(getPostLoginRedirectPath("operatore")).toBe("/");
    expect(getPostLoginRedirectPath("dipendente")).toBe("/");
    expect(getPostLoginRedirectPath("segnalatore")).toBe("/segnalazioni/app");
    expect(getDevLoginRedirectHash("admin")).toBe("/#/");
    expect(getDevLoginRedirectHash("segnalatore")).toBe("/#/segnalazioni/app");
  });
});
