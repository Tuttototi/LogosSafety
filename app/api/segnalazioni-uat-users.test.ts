import { describe, expect, it } from "vitest";
import {
  assertDevIdentitySelectionAllowed,
  assertLocalUatDatabaseUrl,
  assertUatSeedAllowed,
  getUatIdentity,
  UAT_IDENTITIES,
} from "./dev/segnalazioni-uat-users";

describe("Segnalazioni UAT users seed guards", () => {
  it("accepts only local logos_safety database URLs", () => {
    expect(() => assertLocalUatDatabaseUrl("mysql://user:pass@localhost:3306/logos_safety")).not.toThrow();

    expect(() => assertLocalUatDatabaseUrl("mysql://user:pass@db.example.test:3306/logos_safety"))
      .toThrow("local database host");
    expect(() => assertLocalUatDatabaseUrl("mysql://user:pass@localhost:3307/logos_safety"))
      .toThrow("local port 3306");
    expect(() => assertLocalUatDatabaseUrl("mysql://user:pass@localhost:3306/other_db"))
      .toThrow("logos_safety database");
  });

  it("blocks seed and DEV identity selection in production", () => {
    expect(() => assertUatSeedAllowed(
      { NODE_ENV: "production" },
      "mysql://user:pass@localhost:3306/logos_safety",
    )).toThrow("not available in production");

    expect(() => assertDevIdentitySelectionAllowed({
      devAuthEnabled: true,
      isProduction: true,
    })).toThrow("not available");
  });

  it("allows only the two explicit UAT identities", () => {
    expect(getUatIdentity("admin")).toEqual(UAT_IDENTITIES.admin);
    expect(getUatIdentity("segnalatore")).toEqual(UAT_IDENTITIES.segnalatore);
    expect(getUatIdentity(undefined)).toEqual(UAT_IDENTITIES.admin);
    expect(() => getUatIdentity("admin&role=superuser")).toThrow("Unsupported DEV identity");
  });
});
