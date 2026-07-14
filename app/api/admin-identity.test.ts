import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLE_OPTIONS,
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
    expect(() => assertAdminIdentityRole("medico_competente")).toThrow("Ruolo non riconosciuto");
    expect(() => assertAdminIdentityRole("auditor")).toThrow("Ruolo non riconosciuto");
    expect(() => assertAdminIdentityRole("sola_lettura")).toThrow("Ruolo non riconosciuto");
    expect(() => assertAdminIdentityRole("superuser")).toThrow("Ruolo non riconosciuto");
  });

  it("exposes exactly the assignable roles requested for identity management", () => {
    expect(ADMIN_ROLE_OPTIONS).toEqual([
      { value: "admin", label: "Admin" },
      { value: "rspp", label: "RSPP" },
      { value: "aspp", label: "ASPP" },
      { value: "responsabile_sicurezza", label: "Responsabile Sicurezza" },
      { value: "operatore_sicurezza", label: "Operatore Sicurezza" },
      { value: "capo_area", label: "Capo Area" },
      { value: "capo_impianto", label: "Capo Impianto" },
      { value: "referente_commessa", label: "Referente Commessa" },
      { value: "operatore", label: "Operatore" },
      { value: "dipendente", label: "Dipendente" },
      { value: "segnalatore", label: "Segnalatore" },
    ]);
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
