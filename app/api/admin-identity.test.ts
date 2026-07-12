import { describe, expect, it } from "vitest";
import {
  assertAdminIdentityRole,
  maskFiscalCode,
  normalizeEmail,
  normalizeFiscalCode,
  normalizePhone,
} from "./admin-identity-router";
import {
  REAL_ADMIN_IDENTITY,
  assertLocalAdminBootstrapDatabaseUrl,
  assertRealAdminBootstrapAllowed,
  summarizeRealAdminBootstrap,
} from "./dev/real-admin-bootstrap";

describe("Admin identity management", () => {
  it("normalizes person identifiers before persistence", () => {
    expect(normalizeFiscalCode(" cndsvt75p08f205j ")).toBe("CNDSVT75P08F205J");
    expect(normalizeEmail(" Safety.Genoma@LOG6S.IT ")).toBe("safety.genoma@log6s.it");
    expect(normalizePhone(" +39   343   851 02 ")).toBe("+39 343 851 02");
  });

  it("masks fiscal code in DTOs and bootstrap summaries", () => {
    const masked = maskFiscalCode(REAL_ADMIN_IDENTITY.fiscalCode);
    expect(masked).toBe("CND**********05J");
    expect(masked).not.toContain(REAL_ADMIN_IDENTITY.fiscalCode);

    const summary = summarizeRealAdminBootstrap({
      roleEnumUpdated: false,
      company: { id: 10, name: "Logos Safety Test" },
      admin: {
        unionId: REAL_ADMIN_IDENTITY.unionId,
        email: REAL_ADMIN_IDENTITY.email,
        name: REAL_ADMIN_IDENTITY.name,
        role: "admin",
        userId: 1,
        workerId: 2,
      },
    });

    expect(JSON.stringify(summary)).not.toContain(REAL_ADMIN_IDENTITY.fiscalCode);
  });

  it("rejects arbitrary roles server-side", () => {
    expect(() => assertAdminIdentityRole("segnalatore")).not.toThrow();
    expect(() => assertAdminIdentityRole("superuser")).toThrow("Ruolo non riconosciuto");
  });

  it("blocks bootstrap on production or non-local databases", () => {
    expect(() => assertRealAdminBootstrapAllowed(
      { NODE_ENV: "production" },
      "mysql://root:secret@localhost:3306/logos_safety",
    )).toThrow("not available in production");
    expect(() => assertLocalAdminBootstrapDatabaseUrl(
      "mysql://root:secret@example.com:3306/logos_safety",
    )).toThrow("local database host");
    expect(() => assertLocalAdminBootstrapDatabaseUrl(
      "mysql://root:secret@localhost:3306/logos_safety",
    )).not.toThrow();
  });
});
