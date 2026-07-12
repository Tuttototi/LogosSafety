import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { Session } from "@contracts/constants";
import { createDevLoginHandler } from "./kimi/auth";
import { selectDatabaseUrlForEnvironment } from "./lib/env";
import type { SessionIdentity } from "./kimi/types";

function createDevAuthApp(options: {
  devAuthEnabled?: boolean;
  isProduction?: boolean;
  seedUatUsers?: () => Promise<unknown>;
  signToken?: (payload: SessionIdentity) => Promise<string>;
}) {
  const app = new Hono();
  app.get("/api/dev/login", createDevLoginHandler({
    authEnv: {
      appId: "logos-safety-test",
      databaseUrl: "mysql://user:pass@localhost:3306/logos_safety",
      devAuthEnabled: options.devAuthEnabled ?? true,
      isProduction: options.isProduction ?? false,
    },
    seedUatUsers: async () => options.seedUatUsers?.(),
    signToken: options.signToken ?? (async (payload) => `token:${payload.unionId}`),
  }));
  return app;
}

describe("auth flow", () => {
  it("selects DATABASE_URL when local DEV_DATABASE_URL omits the password for the same local database", () => {
    expect(selectDatabaseUrlForEnvironment({
      NODE_ENV: "development",
      DEV_DATABASE_URL: "mysql://root@localhost:3306/logos_safety",
      DATABASE_URL: "mysql://root:secret@localhost:3306/logos_safety",
    })).toBe("mysql://root:secret@localhost:3306/logos_safety");
  });

  it("keeps DEV_DATABASE_URL when it has complete credentials", () => {
    expect(selectDatabaseUrlForEnvironment({
      NODE_ENV: "development",
      DEV_DATABASE_URL: "mysql://dev:secret@localhost:3306/logos_safety",
      DATABASE_URL: "mysql://root:secret@localhost:3306/logos_safety",
    })).toBe("mysql://dev:secret@localhost:3306/logos_safety");
  });

  it("disables the DEV login endpoint in production", async () => {
    const app = createDevAuthApp({ isProduction: true });

    const response = await app.request("http://localhost/api/dev/login?identity=admin");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not available in production" });
  });

  it("creates an Admin UAT session and redirects to Segnalazioni", async () => {
    const issuedTokens: SessionIdentity[] = [];
    const app = createDevAuthApp({
      signToken: async (payload) => {
        issuedTokens.push(payload);
        return "admin-token";
      },
    });

    const response = await app.request("http://localhost/api/dev/login?identity=admin");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/#/segnalazioni");
    expect(response.headers.get("set-cookie")).toContain(`${Session.cookieName}=admin-token`);
    expect(issuedTokens).toEqual([{
      unionId: "uat-segnalazioni-admin",
      clientId: "logos-safety-test",
    }]);
  });

  it("creates a Segnalatore UAT session and redirects to the mobile app", async () => {
    const issuedTokens: SessionIdentity[] = [];
    const app = createDevAuthApp({
      signToken: async (payload) => {
        issuedTokens.push(payload);
        return "segnalatore-token";
      },
    });

    const response = await app.request("http://localhost/api/dev/login?identity=segnalatore");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/#/segnalazioni/app");
    expect(response.headers.get("set-cookie")).toContain(`${Session.cookieName}=segnalatore-token`);
    expect(issuedTokens).toEqual([{
      unionId: "uat-segnalazioni-segnalatore",
      clientId: "logos-safety-test",
    }]);
  });

  it("returns a controlled error when the UAT fixture is unavailable", async () => {
    const app = createDevAuthApp({
      seedUatUsers: async () => {
        throw new Error("fixture unavailable");
      },
    });

    const response = await app.request("http://localhost/api/dev/login?identity=admin");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "DEV login fixture unavailable" });
  });

  it("switches Admin to Segnalatore only by issuing a new backend session", async () => {
    const issuedTokens: SessionIdentity[] = [];
    const app = createDevAuthApp({
      signToken: async (payload) => {
        issuedTokens.push(payload);
        return `token:${payload.unionId}`;
      },
    });

    await app.request("http://localhost/api/dev/login?identity=admin");
    await app.request("http://localhost/api/dev/login?identity=segnalatore");

    expect(issuedTokens.map((token) => token.unionId)).toEqual([
      "uat-segnalazioni-admin",
      "uat-segnalazioni-segnalatore",
    ]);
  });
});
