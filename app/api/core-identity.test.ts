import { describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import { Permission, Role } from "@/modules/core/domain";
import type { CoreIdentityRepository } from "./core/identity";
import {
  CoreIdentityErrorCode,
  CoreIdentityService,
  toSegnalazioniActor,
  type IdentityCompanyRecord,
  type IdentityPersonRecord,
  type IdentityScopeRecord,
  type IdentityUserRecord,
} from "./core/identity";
import { SegnalazioniRole } from "@/modules/segnalazioni/domain";

const createdAt = new Date("2026-07-11T10:00:00.000Z");
const updatedAt = new Date("2026-07-11T10:10:00.000Z");

function makeAuthenticatedUser(overrides: Partial<User> = {}): User {
  return {
    id: 10,
    unionId: "identity-user",
    name: "Mario Rossi",
    email: "mario.rossi@example.test",
    avatar: null,
    role: "responsabile_sicurezza",
    active: true,
    createdAt,
    updatedAt,
    lastSignInAt: updatedAt,
    createdBy: null,
    ...overrides,
  };
}

function makeUser(overrides: Partial<IdentityUserRecord> = {}): IdentityUserRecord {
  return {
    id: 10,
    unionId: "identity-user",
    name: "Mario Rossi",
    email: "mario.rossi@example.test",
    role: "responsabile_sicurezza",
    active: true,
    createdAt,
    updatedAt,
    lastSignInAt: updatedAt,
    ...overrides,
  };
}

function makePerson(overrides: Partial<IdentityPersonRecord> = {}): IdentityPersonRecord {
  return {
    id: 20,
    firstName: "Mario",
    lastName: "Rossi",
    fiscalCode: "RSSMRA80A01H501U",
    email: "mario.rossi@example.test",
    phone: null,
    companyId: 30,
    siteId: 40,
    contractId: 50,
    status: "attivo",
    active: true,
    deletedAt: null,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function makeCompany(overrides: Partial<IdentityCompanyRecord> = {}): IdentityCompanyRecord {
  return {
    id: 30,
    name: "Logos Test Company",
    vatNumber: "12345678901",
    fiscalCode: "12345678901",
    isCooperative: false,
    active: true,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function makeScope(overrides: Partial<IdentityScopeRecord> = {}): IdentityScopeRecord {
  return {
    id: 100,
    userId: 10,
    companyId: 30,
    siteId: 40,
    contractId: 50,
    active: true,
    siteCompanyId: 30,
    contractSiteId: 40,
    ...overrides,
  };
}

class FakeCoreIdentityRepository implements CoreIdentityRepository {
  user: IdentityUserRecord | null = makeUser();
  people: IdentityPersonRecord[] = [makePerson()];
  company: IdentityCompanyRecord | null = makeCompany();
  scopes: IdentityScopeRecord[] = [makeScope()];
  error?: Error;

  async findUserById(): Promise<IdentityUserRecord | null> {
    if (this.error) throw this.error;
    return this.user;
  }

  async findPeopleByUser(): Promise<IdentityPersonRecord[]> {
    if (this.error) throw this.error;
    return this.people;
  }

  async findCompanyById(): Promise<IdentityCompanyRecord | null> {
    if (this.error) throw this.error;
    return this.company;
  }

  async listScopesByUserId(): Promise<IdentityScopeRecord[]> {
    if (this.error) throw this.error;
    return this.scopes;
  }
}

async function expectIdentityError(
  action: Promise<unknown>,
  code: CoreIdentityErrorCode,
): Promise<void> {
  await expect(action).rejects.toMatchObject({ code });
}

function makeService(repository: FakeCoreIdentityRepository): CoreIdentityService {
  return new CoreIdentityService(repository);
}

describe("CoreIdentityService", () => {
  it("resolves a valid user with person, company and explicit scope", async () => {
    const repository = new FakeCoreIdentityRepository();
    const actor = await makeService(repository).resolveActorContext(makeAuthenticatedUser());

    expect(actor).toMatchObject({
      tenantId: "30",
      companyId: "30",
      userId: "10",
      personId: "20",
      role: Role.ResponsabileSicurezza,
      active: true,
      canAccessAllTenants: false,
      displayName: "Mario Rossi",
    });
    expect(actor.organizationalScope.organizationIds).toEqual(["30"]);
    expect(actor.organizationalScope.siteIds).toEqual(["40"]);
    expect(actor.organizationalScope.contractIds).toEqual(["50"]);
    expect(actor.permissions).toContain(Permission.DashboardView);
    expect(actor.permissions).toContain(Permission.AdminIdentityManageOperational);
    expect(actor.permissions).not.toContain(Permission.SettingsManage);
  });

  it("blocks unauthenticated resolution", async () => {
    await expectIdentityError(
      makeService(new FakeCoreIdentityRepository()).resolveActorContext(undefined),
      CoreIdentityErrorCode.IdentityNotFound,
    );
  });

  it("blocks inactive accounts", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.user = makeUser({ active: false });

    await expectIdentityError(
      makeService(repository).resolveActorContext(makeAuthenticatedUser()),
      CoreIdentityErrorCode.AccountInactive,
    );
  });

  it("blocks users without a linked worker/person", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.people = [];

    await expectIdentityError(
      makeService(repository).resolveActorContext(makeAuthenticatedUser()),
      CoreIdentityErrorCode.PersonNotLinked,
    );
  });

  it("blocks missing or inactive companies", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.company = null;

    await expectIdentityError(
      makeService(repository).resolveActorContext(makeAuthenticatedUser()),
      CoreIdentityErrorCode.CompanyNotLinked,
    );
  });

  it("blocks unknown roles", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.user = makeUser({ role: "unknown" as IdentityUserRecord["role"] });

    await expectIdentityError(
      makeService(repository).resolveActorContext(makeAuthenticatedUser()),
      CoreIdentityErrorCode.InvalidRole,
    );
  });

  it("accepts a coherent site and contract scope", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.scopes = [makeScope({ siteId: 41, contractId: 51, siteCompanyId: 30, contractSiteId: 41 })];

    const actor = await makeService(repository).resolveActorContext(makeAuthenticatedUser());

    expect(actor.scopes[0]).toMatchObject({
      tenantId: "30",
      organizationIds: ["30"],
      siteIds: ["41"],
      contractIds: ["51"],
    });
  });

  it("blocks cross-company scopes", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.scopes = [makeScope({ companyId: 999, siteCompanyId: 999 })];

    await expectIdentityError(
      makeService(repository).resolveActorContext(makeAuthenticatedUser()),
      CoreIdentityErrorCode.CrossTenantScope,
    );
  });

  it("derives a company-wide scope for management roles without explicit scope rows", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.scopes = [];
    repository.user = makeUser({ role: "admin" });

    const actor = await makeService(repository).resolveActorContext(makeAuthenticatedUser({ role: "admin" }));

    expect(actor.organizationalScope.organizationIds).toEqual(["30"]);
    expect(actor.organizationalScope.allSites).toBe(true);
    expect(actor.organizationalScope.allContracts).toBe(true);
    expect(actor.canAccessAllTenants).toBe(false);
  });

  it("derives a company-wide scope for RSPP without explicit scope rows", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.scopes = [];
    repository.user = makeUser({ role: "rspp" });

    const actor = await makeService(repository).resolveActorContext(makeAuthenticatedUser({ role: "rspp" }));

    expect(actor.organizationalScope.organizationIds).toEqual(["30"]);
    expect(actor.organizationalScope.allSites).toBe(true);
    expect(actor.organizationalScope.allContracts).toBe(true);
    expect(actor.permissions).toContain(Permission.AdminIdentityManageOperational);
    expect(actor.permissions).not.toContain(Permission.AdminIdentityManage);
  });

  it("derives a limited worker scope for non-management users without explicit scope rows", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.scopes = [];
    repository.user = makeUser({ role: "operatore_sicurezza" });
    repository.people = [makePerson({ siteId: 44, contractId: 55 })];

    const actor = await makeService(repository).resolveActorContext(
      makeAuthenticatedUser({ role: "operatore_sicurezza" }),
    );

    expect(actor.organizationalScope.organizationIds).toEqual(["30"]);
    expect(actor.organizationalScope.siteIds).toEqual(["44"]);
    expect(actor.organizationalScope.contractIds).toEqual(["55"]);
  });

  it("never grants cross-tenant privileges from legacy role alone", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.user = makeUser({ role: "admin" });
    repository.scopes = [];

    const actor = await makeService(repository).resolveActorContext(makeAuthenticatedUser({ role: "admin" }));

    expect(actor.canAccessAllTenants).toBe(false);
  });

  it("maps ActorContext to a Segnalazioni actor", async () => {
    const actor = await makeService(new FakeCoreIdentityRepository()).resolveActorContext(makeAuthenticatedUser());
    const segnalazioniActor = toSegnalazioniActor(actor);

    expect(segnalazioniActor).toMatchObject({
      userId: "10",
      personId: "20",
      tenantId: "30",
      companyId: "30",
      role: SegnalazioniRole.ResponsabileSicurezza,
      active: true,
      canAccessAllTenants: false,
    });
    expect(segnalazioniActor.assignedScopes?.[0]).toMatchObject({
      tenantId: "30",
      companyId: "30",
      siteId: "40",
      contractId: "50",
    });
  });

  it("sanitizes unexpected repository failures", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.error = new Error("raw database connection details");

    await expect(makeService(repository).resolveActorContext(makeAuthenticatedUser())).rejects.toMatchObject({
      code: CoreIdentityErrorCode.IdentityConfigurationError,
      message: "Identity configuration error",
    });
  });

  it("blocks duplicate scope assignments", async () => {
    const repository = new FakeCoreIdentityRepository();
    repository.scopes = [makeScope({ id: 1 }), makeScope({ id: 2 })];

    await expectIdentityError(
      makeService(repository).resolveActorContext(makeAuthenticatedUser()),
      CoreIdentityErrorCode.InvalidScope,
    );
  });
});
