import { describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import {
  canAccessCompany,
  canAccessContract,
  canAccessSite,
  isGlobalOrganizationRole,
  type OrganizationScopeAssignment,
} from "./organization-scope";

type Role = User["role"];

const companyScope: OrganizationScopeAssignment = {
  companyId: 10,
  siteId: null,
  contractId: null,
};

const siteScope: OrganizationScopeAssignment = {
  companyId: 10,
  siteId: 20,
  contractId: null,
};

const contractScope: OrganizationScopeAssignment = {
  companyId: 10,
  siteId: 20,
  contractId: 30,
};

describe("organizational scope policy", () => {
  it.each<Role>(["admin", "responsabile_sicurezza"])(
    "treats %s as a global role",
    role => {
      expect(isGlobalOrganizationRole(role)).toBe(true);
      expect(canAccessCompany(role, [], 999)).toBe(true);
      expect(
        canAccessSite(role, [], { companyId: 999, siteId: 999 })
      ).toBe(true);
      expect(
        canAccessContract(role, [], {
          companyId: 999,
          siteId: 999,
          contractId: 999,
        })
      ).toBe(true);
    }
  );

  it.each<Role>([
    "operatore_sicurezza",
    "medico_competente",
    "referente_commessa",
    "auditor",
    "sola_lettura",
  ])("applies default deny to %s without assignments", role => {
    expect(isGlobalOrganizationRole(role)).toBe(false);
    expect(canAccessCompany(role, [], 10)).toBe(false);
    expect(canAccessSite(role, [], { companyId: 10, siteId: 20 })).toBe(
      false
    );
    expect(
      canAccessContract(role, [], {
        companyId: 10,
        siteId: 20,
        contractId: 30,
      })
    ).toBe(false);
  });

  it("grants a company scope to every site and contract in that company", () => {
    const scopes = [companyScope];

    expect(canAccessCompany("operatore_sicurezza", scopes, 10)).toBe(true);
    expect(
      canAccessSite("operatore_sicurezza", scopes, {
        companyId: 10,
        siteId: 99,
      })
    ).toBe(true);
    expect(
      canAccessContract("operatore_sicurezza", scopes, {
        companyId: 10,
        siteId: 99,
        contractId: 999,
      })
    ).toBe(true);
    expect(canAccessCompany("operatore_sicurezza", scopes, 11)).toBe(false);
  });

  it("limits a site scope to its site and contracts", () => {
    const scopes = [siteScope];

    expect(canAccessCompany("referente_commessa", scopes, 10)).toBe(true);
    expect(
      canAccessSite("referente_commessa", scopes, {
        companyId: 10,
        siteId: 20,
      })
    ).toBe(true);
    expect(
      canAccessSite("referente_commessa", scopes, {
        companyId: 10,
        siteId: 21,
      })
    ).toBe(false);
    expect(
      canAccessContract("referente_commessa", scopes, {
        companyId: 10,
        siteId: 20,
        contractId: 999,
      })
    ).toBe(true);
    expect(
      canAccessContract("referente_commessa", scopes, {
        companyId: 10,
        siteId: 21,
        contractId: 999,
      })
    ).toBe(false);
  });

  it("limits a contract scope to the assigned contract", () => {
    const scopes = [contractScope];

    expect(canAccessCompany("auditor", scopes, 10)).toBe(true);
    expect(
      canAccessSite("auditor", scopes, { companyId: 10, siteId: 20 })
    ).toBe(true);
    expect(
      canAccessContract("auditor", scopes, {
        companyId: 10,
        siteId: 20,
        contractId: 30,
      })
    ).toBe(true);
    expect(
      canAccessContract("auditor", scopes, {
        companyId: 10,
        siteId: 20,
        contractId: 31,
      })
    ).toBe(false);
  });

  it("never accepts matching site or contract IDs from another company", () => {
    const scopes = [siteScope, contractScope];

    expect(
      canAccessSite("sola_lettura", scopes, {
        companyId: 11,
        siteId: 20,
      })
    ).toBe(false);
    expect(
      canAccessContract("sola_lettura", scopes, {
        companyId: 11,
        siteId: 20,
        contractId: 30,
      })
    ).toBe(false);
  });
});
