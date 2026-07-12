import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { Session } from "@contracts/constants";
import { createDevLoginHandler } from "./kimi/auth";
import {
  describeDatabaseUrl,
  loadLocalEnvFiles,
  selectDatabaseUrlForEnvironment,
} from "./lib/env";
import type { SessionIdentity } from "./kimi/types";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

  it("loads ignored local env files after .env without overriding shell variables", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "logos-env-"));
    fs.writeFileSync(
      path.join(tempDir, ".env"),
      [
        "DEV_DATABASE_URL=mysql://root@localhost:3306/logos_safety",
        "DATABASE_URL=mysql://root@localhost:3306/logos_safety",
        "SHELL_ONLY=from-env",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(tempDir, ".env.local"),
      [
        "DEV_DATABASE_URL=mysql://root:local-secret@localhost:3306/logos_safety",
        "SHELL_ONLY=from-local",
      ].join("\n"),
    );
    const env = {
      NODE_ENV: "development",
      SHELL_ONLY: "from-shell",
    } as NodeJS.ProcessEnv;

    const loadedFiles = loadLocalEnvFiles(tempDir, env);

    expect(loadedFiles).toEqual([".env", ".env.local"]);
    expect(env.DEV_DATABASE_URL).toBe("mysql://root:local-secret@localhost:3306/logos_safety");
    expect(env.DATABASE_URL).toBe("mysql://root@localhost:3306/logos_safety");
    expect(env.SHELL_ONLY).toBe("from-shell");
  });

  it("describes database URLs without exposing credentials", () => {
    expect(describeDatabaseUrl("mysql://root:local-secret@localhost:3306/logos_safety")).toEqual({
      protocol: "mysql",
      host: "localhost",
      port: "3306",
      database: "logos_safety",
      hasUsername: true,
      hasPassword: true,
    });
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
    await expect(response.json()).resolves.toEqual({ error: "DEV_UAT_FIXTURE_NOT_FOUND" });
  });

  it("returns a diagnostic database error when local DEV database is unavailable", async () => {
    const app = createDevAuthApp({
      seedUatUsers: async () => {
        throw new Error("Access denied for user root");
      },
    });

    const response = await app.request("http://localhost/api/dev/login?identity=admin");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "DEV_DATABASE_UNAVAILABLE" });
  });

  it("returns a diagnostic identity error for unsupported DEV identities", async () => {
    const app = createDevAuthApp({});

    const response = await app.request("http://localhost/api/dev/login?identity=superuser");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "DEV_UAT_IDENTITY_INVALID" });
  });

  it("ignores client role query parameters when issuing DEV sessions", async () => {
    const issuedTokens: SessionIdentity[] = [];
    const app = createDevAuthApp({
      signToken: async (payload) => {
        issuedTokens.push(payload);
        return "admin-token";
      },
    });

    const response = await app.request("http://localhost/api/dev/login?identity=admin&role=superuser");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/#/segnalazioni");
    expect(issuedTokens).toEqual([{
      unionId: "uat-segnalazioni-admin",
      clientId: "logos-safety-test",
    }]);
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
