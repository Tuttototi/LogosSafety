import { describe, expect, it } from "vitest";
import {
  canAccessModule,
  canAccessPath,
  getAuthorizedHomePath,
} from "@/lib/module-access";
import { Permission } from "@/modules/core/domain";

describe("module RBAC access policy", () => {
  it("routes only segnalatore to the standalone Safety App", () => {
    expect(getAuthorizedHomePath({ role: "segnalatore" })).toBe("/segnalazioni/app");
    expect(getAuthorizedHomePath({ role: "admin" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "rspp" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "aspp" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "responsabile_sicurezza" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "operatore_sicurezza" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "capo_area" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "capo_impianto" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "referente_commessa" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "operatore" })).toBe("/");
    expect(getAuthorizedHomePath({ role: "dipendente" })).toBe("/");
  });

  it("keeps segnalatore out of the management portal even with report permissions", () => {
    const segnalatore = {
      role: "segnalatore",
      permissions: [
        Permission.SegnalazioniCreate,
        Permission.SegnalazioniViewOwn,
      ],
    };

    expect(canAccessModule(segnalatore, "reportsSafetyApp")).toBe(true);
    expect(canAccessPath(segnalatore, "/segnalazioni/app")).toBe(true);
    expect(canAccessPath(segnalatore, "/")).toBe(false);
    expect(canAccessPath(segnalatore, "/segnalazioni")).toBe(false);
    expect(canAccessPath(segnalatore, "/anagrafiche-utenti")).toBe(false);
  });

  it("allows Admin to access every management module and blocks the Safety App", () => {
    const admin = {
      role: "admin",
      permissions: [
        Permission.DashboardView,
        Permission.AdminIdentityView,
        Permission.HseOperationalView,
        Permission.FormazioneView,
        Permission.SorveglianzaSanitariaViewOperational,
        Permission.ScadenzeView,
        Permission.SegnalazioniViewScope,
        Permission.MicroclimaView,
        Permission.DocumentiView,
        Permission.SettingsManage,
        Permission.AuditView,
        Permission.ImportExportUse,
      ],
    };

    expect(canAccessPath(admin, "/")).toBe(true);
    expect(canAccessPath(admin, "/anagrafiche-utenti")).toBe(true);
    expect(canAccessPath(admin, "/dipendenti")).toBe(true);
    expect(canAccessPath(admin, "/formazione")).toBe(true);
    expect(canAccessPath(admin, "/sorveglianza")).toBe(true);
    expect(canAccessPath(admin, "/mansioni")).toBe(true);
    expect(canAccessPath(admin, "/scadenziario")).toBe(true);
    expect(canAccessPath(admin, "/segnalazioni")).toBe(true);
    expect(canAccessPath(admin, "/microclima")).toBe(true);
    expect(canAccessPath(admin, "/documenti")).toBe(true);
    expect(canAccessPath(admin, "/impostazioni")).toBe(true);
    expect(canAccessPath(admin, "/audit")).toBe(true);
    expect(canAccessPath(admin, "/import-export")).toBe(true);
    expect(canAccessPath(admin, "/segnalazioni/app")).toBe(false);
  });

  it("allows operational safety roles to identity management only through permission", () => {
    const rspp = {
      role: "rspp",
      permissions: [
        Permission.DashboardView,
        Permission.AdminIdentityView,
        Permission.AdminIdentityManageOperational,
        Permission.SegnalazioniViewScope,
        Permission.MicroclimaView,
        Permission.SorveglianzaSanitariaViewOperational,
      ],
    };

    expect(canAccessModule(rspp, "dashboard")).toBe(true);
    expect(canAccessModule(rspp, "adminIdentity")).toBe(true);
    expect(canAccessModule(rspp, "microclima")).toBe(true);
    expect(canAccessModule(rspp, "healthSurveillance")).toBe(true);
    expect(canAccessModule(rspp, "settings")).toBe(false);
    expect(canAccessModule(rspp, "reportsSafetyApp")).toBe(false);
  });
});
