import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  segnalazioneAcknowledgements,
  segnalazioneAttachments,
  segnalazioneComments,
  segnalazioneWorkflowEvents,
  segnalazioni,
} from "@db/schema";
import * as schema from "@db/schema";
import type { AcknowledgementRecord, ApplicationActor } from "@/modules/segnalazioni/application";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoSegnalazione,
  type Commento,
  type OrganizationalScope,
  type Segnalazione,
} from "@/modules/segnalazioni/domain";
import { DrizzleSegnalazioniRepository } from "@/modules/segnalazioni/infrastructure/persistence";

const integrationEnabled = process.env.SEGNALAZIONI_MYSQL_INTEGRATION === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

const TENANT_A = "it-seg-mysql-tenant-a";
const TENANT_B = "it-seg-mysql-tenant-b";
const COMPANY_A = "it-seg-mysql-company-a";
const COMPANY_B = "it-seg-mysql-company-b";
const TEST_TENANTS = [TENANT_A, TENANT_B];

const createdAt = "2026-07-11T10:00:00.000Z";
const updatedAt = "2026-07-11T10:10:00.000Z";

let pool: Pool;
let db: MySql2Database<typeof schema>;
let repository: DrizzleSegnalazioniRepository;

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Segnalazioni MySQL integration tests");

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Segnalazioni MySQL integration tests require a local database host");
  }

  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Segnalazioni MySQL integration tests require local port 3306");
  }

  if (parsed.pathname.replace("/", "") !== "logos_safety") {
    throw new Error("Segnalazioni MySQL integration tests require the logos_safety database");
  }

  return databaseUrl;
}

function makeScope(overrides: Partial<OrganizationalScope> = {}): OrganizationalScope {
  const tenantId = overrides.tenantId ?? TENANT_A;
  const companyId = overrides.companyId ?? COMPANY_A;

  return {
    tenantId,
    companyId,
    contractId: "it-seg-mysql-contract-a",
    siteId: "it-seg-mysql-site-a",
    plantId: "it-seg-mysql-plant-a",
    areaId: "it-seg-mysql-area-a",
    ...overrides,
  };
}

function makeActor(overrides: Partial<ApplicationActor> = {}): ApplicationActor {
  const scopeOverrides: Partial<OrganizationalScope> = {};
  if (overrides.tenantId) scopeOverrides.tenantId = overrides.tenantId;
  if (overrides.companyId) scopeOverrides.companyId = overrides.companyId;

  const organizationalScope = overrides.organizationalScope ?? makeScope(scopeOverrides);

  return {
    userId: "it-seg-mysql-user-a",
    personId: "it-seg-mysql-person-a",
    employeeId: "it-seg-mysql-employee-a",
    firstName: "Integration",
    lastName: "Reporter",
    email: "integration.reporter@example.test",
    tenantId: organizationalScope.tenantId,
    companyId: organizationalScope.companyId,
    role: SegnalazioniRole.ResponsabileSicurezza,
    active: true,
    organizationalScope,
    assignedScopes: [organizationalScope],
    ...overrides,
  };
}

function makeSegnalazione(overrides: Partial<Segnalazione> = {}): Segnalazione {
  const tenantId = overrides.tenantId ?? TENANT_A;
  const companyId = overrides.companyId ?? COMPANY_A;
  const organizationalScope = overrides.organizationalScope ?? makeScope({ tenantId, companyId });

  return {
    id: "it-seg-mysql-report-a",
    code: "IT-SEG-MYSQL-001",
    tenantId,
    companyId,
    reporter: {
      userId: "it-seg-mysql-user-a",
      personId: "it-seg-mysql-person-a",
      employeeId: "it-seg-mysql-employee-a",
      firstName: "Integration",
      lastName: "Reporter",
      email: "integration.reporter@example.test",
      companyId,
      role: SegnalazioniRole.Segnalatore,
    },
    createdByUserId: "it-seg-mysql-user-a",
    createdByPersonId: "it-seg-mysql-person-a",
    organizationalScope,
    title: "Segnalazione integrazione MySQL",
    description: "Record creato da test d'integrazione su database locale isolato.",
    priority: PrioritaSegnalazione.Alta,
    severity: GravitaSegnalazione.Alta,
    status: StatoSegnalazione.Nuova,
    category: CategoriaSegnalazione.Sicurezza,
    type: TipoSegnalazione.Pericolo,
    attachments: [],
    comments: [],
    workflow: [],
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function makeComment(overrides: Partial<Commento> = {}): Commento {
  return {
    id: "it-seg-mysql-comment-a",
    segnalazioneId: "it-seg-mysql-report-a",
    testo: "Commento aggiunto dal repository reale.",
    autoreId: "it-seg-mysql-user-rspp",
    autoreNome: "Integration RSPP",
    pubblico: true,
    allegati: [],
    createdAt: updatedAt,
    updatedAt,
    ...overrides,
  };
}

function makeAcknowledgement(overrides: Partial<AcknowledgementRecord> = {}): AcknowledgementRecord {
  return {
    id: "it-seg-mysql-ack-a",
    segnalazioneId: "it-seg-mysql-report-a",
    tenantId: TENANT_A,
    companyId: COMPANY_A,
    userId: "it-seg-mysql-user-a",
    personId: "it-seg-mysql-person-a",
    acknowledgedAt: "2026-07-11T10:20:00.000Z",
    ...overrides,
  };
}

async function cleanupTestData(): Promise<void> {
  await db.delete(segnalazioneAcknowledgements).where(inArray(segnalazioneAcknowledgements.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneAttachments).where(inArray(segnalazioneAttachments.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneComments).where(inArray(segnalazioneComments.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneWorkflowEvents).where(inArray(segnalazioneWorkflowEvents.tenantId, TEST_TENANTS));
  await db.delete(segnalazioni).where(inArray(segnalazioni.tenantId, TEST_TENANTS));
}

describeIntegration("DrizzleSegnalazioniRepository MySQL integration", () => {
  beforeAll(async () => {
    pool = mysql.createPool(requireLocalDatabaseUrl());
    db = drizzle(pool, { schema, mode: "default" });
    repository = new DrizzleSegnalazioniRepository(db);
    await cleanupTestData();
  });

  afterAll(async () => {
    if (db) await cleanupTestData();
    if (pool) await pool.end();
  });

  it("validates persistence, constraints, filters, tenant isolation and cleanup boundaries", async () => {
    const mainReport = makeSegnalazione();
    const otherAuthorReport = makeSegnalazione({
      id: "it-seg-mysql-report-other-author",
      code: "IT-SEG-MYSQL-002",
      createdByUserId: "it-seg-mysql-user-b",
      createdByPersonId: "it-seg-mysql-person-b",
      reporter: {
        userId: "it-seg-mysql-user-b",
        personId: "it-seg-mysql-person-b",
        firstName: "Other",
        lastName: "Reporter",
        companyId: COMPANY_A,
        role: SegnalazioniRole.Segnalatore,
      },
    });
    const otherPlantReport = makeSegnalazione({
      id: "it-seg-mysql-report-other-plant",
      code: "IT-SEG-MYSQL-003",
      organizationalScope: makeScope({ plantId: "it-seg-mysql-plant-b" }),
    });
    const sameCodeOtherTenant = makeSegnalazione({
      id: "it-seg-mysql-report-tenant-b",
      tenantId: TENANT_B,
      companyId: COMPANY_B,
      organizationalScope: makeScope({
        tenantId: TENANT_B,
        companyId: COMPANY_B,
        plantId: "it-seg-mysql-plant-b",
      }),
      code: mainReport.code,
      reporter: {
        userId: "it-seg-mysql-user-tenant-b",
        personId: "it-seg-mysql-person-tenant-b",
        firstName: "Tenant",
        lastName: "B",
        companyId: COMPANY_B,
        role: SegnalazioniRole.Segnalatore,
      },
      createdByUserId: "it-seg-mysql-user-tenant-b",
      createdByPersonId: "it-seg-mysql-person-tenant-b",
    });

    await repository.create(mainReport);
    await repository.create(otherAuthorReport);
    await repository.create(otherPlantReport);
    await repository.create(sameCodeOtherTenant);

    const created = await repository.findById(mainReport.id, TENANT_A);
    expect(created).toMatchObject({
      id: mainReport.id,
      code: mainReport.code,
      tenantId: TENANT_A,
      status: StatoSegnalazione.Nuova,
      reporter: {
        userId: "it-seg-mysql-user-a",
        firstName: "Integration",
        lastName: "Reporter",
        email: "integration.reporter@example.test",
      },
    });

    expect(await repository.findById(mainReport.id, TENANT_B)).toBeNull();
    expect(await repository.existsByCode(mainReport.code, TENANT_A)).toBe(true);
    expect(await repository.existsByCode(mainReport.code, TENANT_B)).toBe(true);

    await expect(
      repository.create(
        makeSegnalazione({
          id: "it-seg-mysql-report-duplicate-code",
          code: mainReport.code,
        }),
      ),
    ).rejects.toThrow();

    if (!created) throw new Error("Created report was not found");
    await repository.update({
      ...created,
      title: "Segnalazione aggiornata da integration test",
      status: StatoSegnalazione.PresaInCarico,
      assignedToUserId: "it-seg-mysql-user-rspp",
      updatedAt,
      workflow: [
        {
          id: "it-seg-mysql-workflow-a",
          segnalazioneId: created.id,
          statoDa: StatoSegnalazione.Nuova,
          statoA: StatoSegnalazione.PresaInCarico,
          eseguitoDaId: "it-seg-mysql-user-rspp",
          eseguitoDaNome: "Integration RSPP",
          note: "Presa in carico test",
          createdAt: updatedAt,
        },
      ],
    });

    const updated = await repository.findById(mainReport.id, TENANT_A);
    expect(updated?.title).toBe("Segnalazione aggiornata da integration test");
    expect(updated?.status).toBe(StatoSegnalazione.PresaInCarico);
    expect(updated?.workflow?.[0]?.statoA).toBe(StatoSegnalazione.PresaInCarico);

    await repository.addComment(makeComment());
    const withComment = await repository.findById(mainReport.id, TENANT_A);
    expect(withComment?.comments).toHaveLength(1);
    expect(withComment?.comments?.[0]?.testo).toBe("Commento aggiunto dal repository reale.");

    await repository.saveAcknowledgement(makeAcknowledgement());
    expect(await repository.hasAcknowledgement(mainReport.id, "it-seg-mysql-user-a", TENANT_A)).toBe(true);
    await expect(
      repository.saveAcknowledgement(
        makeAcknowledgement({
          id: "it-seg-mysql-ack-duplicate",
        }),
      ),
    ).rejects.toThrow();

    const rsppActor = makeActor();
    const tenantAReports = await repository.listVisibleByScope({ actor: rsppActor });
    expect(tenantAReports.map((report) => report.id)).toEqual(
      expect.arrayContaining([mainReport.id, otherAuthorReport.id, otherPlantReport.id]),
    );
    expect(tenantAReports.map((report) => report.id)).not.toContain(sameCodeOtherTenant.id);

    const selfActor = makeActor({
      role: SegnalazioniRole.Segnalatore,
      userId: "it-seg-mysql-user-a",
      personId: "it-seg-mysql-person-a",
    });
    const selfReports = await repository.listVisibleByScope({ actor: selfActor });
    expect(selfReports.map((report) => report.id)).toContain(mainReport.id);
    expect(selfReports.map((report) => report.id)).not.toContain(otherAuthorReport.id);

    const plantReports = await repository.listVisibleByScope({
      actor: rsppActor,
      organizationalScope: makeScope({ plantId: "it-seg-mysql-plant-a" }),
    });
    expect(plantReports.map((report) => report.id)).toContain(mainReport.id);
    expect(plantReports.map((report) => report.id)).not.toContain(otherPlantReport.id);

    await db
      .update(segnalazioni)
      .set({
        deletedAt: new Date("2026-07-11T10:30:00.000Z"),
        deletedByUserId: "it-seg-mysql-cleanup",
      })
      .where(and(eq(segnalazioni.id, mainReport.id), eq(segnalazioni.tenantId, TENANT_A)));

    expect(await repository.findById(mainReport.id, TENANT_A)).toBeNull();
    const afterSoftDelete = await repository.listVisibleByScope({ actor: rsppActor });
    expect(afterSoftDelete.map((report) => report.id)).not.toContain(mainReport.id);

    const rawSoftDeletedRows = await db
      .select({ id: segnalazioni.id })
      .from(segnalazioni)
      .where(and(eq(segnalazioni.id, mainReport.id), eq(segnalazioni.tenantId, TENANT_A), isNull(segnalazioni.deletedAt)));
    expect(rawSoftDeletedRows).toHaveLength(0);
  });
});
