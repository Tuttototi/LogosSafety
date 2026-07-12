import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { users } from "@db/schema";
import { getDb } from "./queries/connection";
import {
  createCoreIdentityService,
  toSegnalazioniActor,
} from "./core/identity";
import { DrizzleOrganizationalScopeRepository } from "./core/organizational-scope";
import {
  seedSegnalazioniUatUsers,
  UAT_IDENTITIES,
} from "./dev/segnalazioni-uat-users";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoSegnalazione,
  canCommentSegnalazione,
  canManageSegnalazione,
  canViewSegnalazione,
  type Segnalazione,
  type SegnalazioniActor,
} from "@/modules/segnalazioni/domain";

const integrationEnabled = process.env.SEGNALAZIONI_UAT_MYSQL_INTEGRATION === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Segnalazioni UAT integration tests");
  return databaseUrl;
}

function makeReport(
  reporter: SegnalazioniActor,
  overrides: Partial<Segnalazione> = {},
): Segnalazione {
  return {
    id: "uat-test-report",
    code: "UAT-SEG-001",
    tenantId: reporter.tenantId,
    companyId: reporter.companyId,
    reporter: {
      userId: reporter.userId,
      personId: reporter.personId,
      firstName: reporter.firstName,
      lastName: reporter.lastName,
      email: reporter.email,
      companyId: reporter.companyId,
      role: reporter.role,
    },
    createdByUserId: reporter.userId,
    createdByPersonId: reporter.personId,
    organizationalScope: reporter.organizationalScope,
    title: "Segnalazione UAT",
    description: "Segnalazione fixture per verifica capability UAT.",
    priority: PrioritaSegnalazione.Alta,
    severity: GravitaSegnalazione.Alta,
    status: StatoSegnalazione.Nuova,
    category: CategoriaSegnalazione.Sicurezza,
    type: TipoSegnalazione.Pericolo,
    attachments: [],
    comments: [],
    workflow: [],
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

describeIntegration("Segnalazioni UAT users MySQL integration", () => {
  it("seeds idempotent local Admin and Segnalatore identities resolved by Core Identity", async () => {
    const first = await seedSegnalazioniUatUsers({ databaseUrl: requireLocalDatabaseUrl() });
    const second = await seedSegnalazioniUatUsers({ databaseUrl: requireLocalDatabaseUrl() });

    expect(second.admin.userId).toBe(first.admin.userId);
    expect(second.segnalatore.userId).toBe(first.segnalatore.userId);
    expect(second.company.id).toBe(first.company.id);
    expect(second.contract.id).toBe(first.contract.id);

    const db = getDb();
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.unionId, UAT_IDENTITIES.admin.unionId))
      .limit(1);
    const [segnalatoreUser] = await db
      .select()
      .from(users)
      .where(eq(users.unionId, UAT_IDENTITIES.segnalatore.unionId))
      .limit(1);

    expect(adminUser).toBeDefined();
    expect(segnalatoreUser).toBeDefined();
    if (!adminUser || !segnalatoreUser) {
      throw new Error("UAT users were not created");
    }

    const identityService = createCoreIdentityService();
    const adminContext = await identityService.resolveActorContext(adminUser);
    const segnalatoreContext = await identityService.resolveActorContext(segnalatoreUser);
    const adminActor = toSegnalazioniActor(adminContext);
    const segnalatoreActor = toSegnalazioniActor(segnalatoreContext);

    expect(adminActor).toMatchObject({
      role: SegnalazioniRole.Admin,
      tenantId: String(second.company.id),
      companyId: String(second.company.id),
      canAccessAllTenants: false,
      active: true,
    });
    expect(segnalatoreActor).toMatchObject({
      role: SegnalazioniRole.Segnalatore,
      tenantId: adminActor.tenantId,
      companyId: adminActor.companyId,
      canAccessAllTenants: false,
      active: true,
    });

    const operationalScopeRepository = new DrizzleOrganizationalScopeRepository();
    const accessibleScope = await operationalScopeRepository.listAccessibleScope(segnalatoreActor);
    expect(accessibleScope.contracts.map((contract) => contract.id)).toContain(String(second.contract.id));
    expect(accessibleScope.sites.map((site) => site.id)).toContain(String(second.site.id));
    expect(accessibleScope.plants.map((plant) => plant.id)).toContain(String(second.plant?.id));

    const ownReport = makeReport(segnalatoreActor);
    const otherReport = makeReport({
      ...segnalatoreActor,
      userId: "uat-other-user",
      personId: "uat-other-person",
      firstName: "Altro",
      lastName: "Utente",
    });

    expect(canViewSegnalazione(adminActor, otherReport)).toBe(true);
    expect(canManageSegnalazione(adminActor, otherReport)).toBe(true);
    expect(canCommentSegnalazione(adminActor, otherReport)).toBe(true);

    expect(canViewSegnalazione(segnalatoreActor, ownReport)).toBe(true);
    expect(canCommentSegnalazione(segnalatoreActor, ownReport)).toBe(true);
    expect(canManageSegnalazione(segnalatoreActor, ownReport)).toBe(false);
    expect(canViewSegnalazione(segnalatoreActor, otherReport)).toBe(false);
  });
});
