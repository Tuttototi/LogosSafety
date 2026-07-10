import { describe, expect, it } from "vitest";
import {
  MembershipType,
  OrganizationType,
  Role,
  createEmptyOrganizationalScope,
  validateMembership,
  validateOrganization,
  validateOrganizationalScope,
  validatePerson,
  validateRoleAssignment,
  validateUserAccount,
  type Membership,
  type Organization,
  type Person,
  type RoleAssignment,
  type UserAccount,
} from "@/modules/core/domain";

const now = "2026-07-10T10:00:00.000Z";

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "person-1",
    tenantId: "tenant-1",
    firstName: "Mario",
    lastName: "Rossi",
    taxCode: "RSSMRA80A01H501U",
    email: "mario.rossi@example.test",
    phone: "+3900000000",
    active: true,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
    ...overrides,
  };
}

function makeOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-1",
    tenantId: "tenant-1",
    type: OrganizationType.GroupCompany,
    legalName: "Logos Safety Srl",
    displayName: "Logos Safety",
    taxCode: "12345678901",
    vatNumber: "12345678901",
    active: true,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
    ...overrides,
  };
}

function makeUserAccount(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    id: "user-1",
    tenantId: "tenant-1",
    personId: "person-1",
    loginIdentifier: "mario.rossi@example.test",
    active: true,
    locked: false,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
    ...overrides,
  };
}

function makeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: "membership-1",
    tenantId: "tenant-1",
    personId: "person-1",
    organizationId: "org-1",
    membershipType: MembershipType.Employee,
    employeeCode: "EMP-001",
    startDate: "2026-01-01",
    active: true,
    ...overrides,
  };
}

function makeRoleAssignment(
  overrides: Partial<RoleAssignment> = {}
): RoleAssignment {
  return {
    id: "assignment-1",
    tenantId: "tenant-1",
    personId: "person-1",
    role: Role.ResponsabileSicurezza,
    organizationalScope: {
      ...createEmptyOrganizationalScope("tenant-1"),
      organizationIds: ["org-1"],
    },
    validFrom: "2026-01-01T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

describe("core domain validation", () => {
  it("accepts a valid active person", () => {
    expect(validatePerson(makePerson()).valid).toBe(true);
  });

  it("blocks an account without a linked person", () => {
    const result = validateUserAccount(makeUserAccount({ personId: "" }));

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain("userAccount.personId is required");
  });

  it("blocks an inactive person from operating through an account", () => {
    const result = validateUserAccount(
      makeUserAccount(),
      makePerson({ active: false })
    );

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain(
        "person linked to userAccount must be active"
      );
  });

  it("blocks a locked account", () => {
    const result = validateUserAccount(makeUserAccount({ locked: true }));

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain("userAccount must not be locked");
  });

  it("blocks a cross-tenant membership", () => {
    const result = validateMembership(
      makeMembership(),
      makePerson({ tenantId: "tenant-1" }),
      makeOrganization({ tenantId: "tenant-2" })
    );

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain(
        "membership.tenantId must match organization.tenantId"
      );
  });

  it("blocks a role assignment without scope", () => {
    const result = validateRoleAssignment(
      makeRoleAssignment({
        organizationalScope: createEmptyOrganizationalScope("tenant-1"),
      }),
      now
    );

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain(
        "organizationalScope must include at least one scoped boundary"
      );
  });

  it("blocks an expired role assignment", () => {
    const result = validateRoleAssignment(
      makeRoleAssignment({
        validTo: "2026-01-01T00:00:00.000Z",
      }),
      now
    );

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain("roleAssignment must not be expired");
  });

  it("accepts a valid organization hierarchy inside the same tenant", () => {
    const parent = makeOrganization({
      id: "org-parent",
      type: OrganizationType.GroupCompany,
    });
    const child = makeOrganization({
      id: "org-child",
      parentOrganizationId: "org-parent",
      type: OrganizationType.Supplier,
      legalName: "Supplier Srl",
      displayName: "Supplier",
    });

    expect(validateOrganization(child, parent).valid).toBe(true);
  });

  it("blocks a cross-tenant scope", () => {
    const result = validateOrganizationalScope(
      {
        ...createEmptyOrganizationalScope("tenant-2"),
        organizationIds: ["org-2"],
      },
      "tenant-1"
    );

    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors).toContain(
        "organizationalScope.tenantId must match expected tenant"
      );
  });

  it("accepts a valid role with a tenant-bound scope", () => {
    expect(validateRoleAssignment(makeRoleAssignment(), now).valid).toBe(true);
  });
});
