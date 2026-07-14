import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@db/schema";
import { Permission, Role, type Role as CoreRole } from "@/modules/core/domain";

const resolveActorContext = vi.fn();

vi.mock("./core/identity", () => ({
  createCoreIdentityService: () => ({
    resolveActorContext,
  }),
}));

const { adminIdentityRouter } = await import("./admin-identity-router");

const now = new Date("2026-07-14T10:00:00.000Z");

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 10,
    unionId: "test-user",
    name: "Test User",
    email: "test.user@example.test",
    avatar: null,
    role: "segnalatore",
    active: true,
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
    createdBy: null,
    ...overrides,
  };
}

function makeCaller(user = makeUser()) {
  return adminIdentityRouter.createCaller({
    req: new Request("http://localhost/api/trpc"),
    resHeaders: new Headers(),
    user,
  });
}

function makeActor(overrides: {
  role?: CoreRole;
  permissions?: string[];
} = {}) {
  return {
    active: true,
    role: overrides.role ?? Role.Admin,
    companyId: "2",
    userId: "10",
    permissions: overrides.permissions ?? [
      Permission.AdminIdentityView,
      Permission.AdminIdentityManage,
    ],
    organizationalScope: {
      tenantId: "2",
      organizationIds: ["2"],
      siteIds: [],
      contractIds: [],
      plantIds: [],
      areaIds: [],
      allOrganizations: false,
      allSites: true,
      allContracts: true,
      allPlants: true,
      allAreas: true,
    },
  };
}

describe("Admin identity RBAC", () => {
  beforeEach(() => {
    resolveActorContext.mockReset();
  });

  it("blocks users without identity management permission from assigning roles", async () => {
    resolveActorContext.mockResolvedValueOnce(makeActor({
      role: Role.Segnalatore,
      permissions: [],
    }));

    await expect(
      makeCaller().assignRole({ personId: 1, role: "segnalatore" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exposes all assignable roles to Admin", async () => {
    resolveActorContext.mockResolvedValueOnce(makeActor());

    await expect(makeCaller(makeUser({ role: "admin" })).roles()).resolves.toEqual([
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

  it("limits RSPP identity management to operator and employee roles", async () => {
    resolveActorContext.mockResolvedValueOnce(makeActor({
      role: Role.Rspp,
      permissions: [
        Permission.AdminIdentityView,
        Permission.AdminIdentityManageOperational,
      ],
    }));

    await expect(makeCaller(makeUser({ role: "rspp" })).roles()).resolves.toEqual([
      { value: "operatore", label: "Operatore" },
      { value: "dipendente", label: "Dipendente" },
    ]);
  });

  it("blocks RSPP from assigning privileged roles before persistence", async () => {
    resolveActorContext.mockResolvedValueOnce(makeActor({
      role: Role.Rspp,
      permissions: [
        Permission.AdminIdentityView,
        Permission.AdminIdentityManageOperational,
      ],
    }));

    await expect(
      makeCaller(makeUser({ role: "rspp" })).assignRole({ personId: 1, role: "admin" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
