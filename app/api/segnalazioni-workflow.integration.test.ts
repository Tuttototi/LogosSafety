import { inArray } from "drizzle-orm";
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
import {
  createAcknowledgeSegnalazioneUseCase,
  createAddCommentUseCase,
  createChangeSegnalazioneStatusUseCase,
  createCloseSegnalazioneUseCase,
  createCreateSegnalazioneUseCase,
  createIntegrateSegnalazioneUseCase,
  createRequestIntegrationUseCase,
  createResolveSegnalazioneUseCase,
  createTakeInChargeSegnalazioneUseCase,
  type ApplicationActor,
  type ApplicationEvent,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type NotificationPort,
  type SegnalazioniUseCaseDependencies,
} from "@/modules/segnalazioni/application";
import {
  CategoriaSegnalazione,
  GravitaSegnalazione,
  PrioritaSegnalazione,
  SegnalazioniRole,
  StatoSegnalazione,
  TipoSegnalazione,
  type OrganizationalScope,
} from "@/modules/segnalazioni/domain";
import { DrizzleSegnalazioniRepository } from "@/modules/segnalazioni/infrastructure/persistence";

const integrationEnabled = process.env.SEGNALAZIONI_WORKFLOW_MYSQL_INTEGRATION === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

const TENANT_ID = "it-seg-workflow-tenant";
const COMPANY_ID = "it-seg-workflow-company";
const REPORT_ID = "it-seg-workflow-report";

let pool: Pool;
let db: MySql2Database<typeof schema>;
let repository: DrizzleSegnalazioniRepository;

class TestClock implements ClockPort {
  private tick = 0;

  now(): string {
    this.tick += 1;
    return new Date(Date.UTC(2026, 6, 12, 8, this.tick, 0)).toISOString();
  }
}

class TestIds implements IdGeneratorPort {
  private idCounter = 0;
  private codeCounter = 0;

  nextId(entity = "id"): string {
    if (entity === "segnalazione") return REPORT_ID;
    this.idCounter += 1;
    return `it-seg-workflow-${entity}-${this.idCounter}`;
  }

  nextCode(prefix = "SEG"): string {
    this.codeCounter += 1;
    return `${prefix}-WF-${this.codeCounter}`;
  }
}

class DeferredAudit implements AuditPort {
  readonly events: ApplicationEvent[] = [];

  async record(event: ApplicationEvent): Promise<void> {
    this.events.push(event);
  }
}

class DeferredNotification implements NotificationPort {
  readonly events: ApplicationEvent[] = [];

  async notify(event: ApplicationEvent): Promise<void> {
    this.events.push(event);
  }
}

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for Segnalazioni workflow MySQL integration tests");

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Segnalazioni workflow integration tests require a local database host");
  }
  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Segnalazioni workflow integration tests require local port 3306");
  }
  if (parsed.pathname.replace("/", "") !== "logos_safety") {
    throw new Error("Segnalazioni workflow integration tests require the logos_safety database");
  }

  return databaseUrl;
}

function makeScope(): OrganizationalScope {
  return {
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    contractId: "it-seg-workflow-contract",
    siteId: "it-seg-workflow-site",
    plantId: "it-seg-workflow-plant",
  };
}

function makeActor(role: SegnalazioniRole, overrides: Partial<ApplicationActor> = {}): ApplicationActor {
  const scope = makeScope();
  return {
    userId: role === SegnalazioniRole.Segnalatore ? "it-seg-workflow-reporter-user" : "it-seg-workflow-manager-user",
    personId: role === SegnalazioniRole.Segnalatore ? "it-seg-workflow-reporter-person" : "it-seg-workflow-manager-person",
    firstName: role === SegnalazioniRole.Segnalatore ? "Reporter" : "Manager",
    lastName: "Workflow",
    email: `${role}@workflow.example.test`,
    tenantId: TENANT_ID,
    companyId: COMPANY_ID,
    role,
    active: true,
    organizationalScope: scope,
    assignedScopes: [scope],
    ...overrides,
  };
}

async function cleanupTestData(): Promise<void> {
  await db.delete(segnalazioneAcknowledgements).where(inArray(segnalazioneAcknowledgements.tenantId, [TENANT_ID]));
  await db.delete(segnalazioneAttachments).where(inArray(segnalazioneAttachments.tenantId, [TENANT_ID]));
  await db.delete(segnalazioneComments).where(inArray(segnalazioneComments.tenantId, [TENANT_ID]));
  await db.delete(segnalazioneWorkflowEvents).where(inArray(segnalazioneWorkflowEvents.tenantId, [TENANT_ID]));
  await db.delete(segnalazioni).where(inArray(segnalazioni.tenantId, [TENANT_ID]));
}

function makeDeps(): SegnalazioniUseCaseDependencies & {
  audit: DeferredAudit;
  notification: DeferredNotification;
} {
  return {
    repository,
    audit: new DeferredAudit(),
    notification: new DeferredNotification(),
    clock: new TestClock(),
    ids: new TestIds(),
  };
}

function unwrap<T>(result: { success: true; data: T } | { success: false; error: unknown }): T {
  if (!result.success) throw new Error(`Unexpected application error: ${JSON.stringify(result.error)}`);
  return result.data;
}

describeIntegration("Segnalazioni operational workflow MySQL integration", () => {
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

  it("persists a full operational workflow, comments, acknowledgement and timeline records", async () => {
    const deps = makeDeps();
    const reporter = makeActor(SegnalazioniRole.Segnalatore);
    const manager = makeActor(SegnalazioniRole.ResponsabileSicurezza);

    const created = unwrap(await createCreateSegnalazioneUseCase(deps)({
      actor: reporter,
      title: "Test workflow operativo",
      description: "Segnalazione creata dal test di workflow operativo reale.",
      priority: PrioritaSegnalazione.Alta,
      severity: GravitaSegnalazione.Alta,
      category: CategoriaSegnalazione.Sicurezza,
      type: TipoSegnalazione.Pericolo,
      organizationalScope: makeScope(),
    }));

    expect(created.id).toBe(REPORT_ID);
    const report = await repository.findById(REPORT_ID, TENANT_ID);
    if (!report) throw new Error("Workflow report fixture was not persisted");

    unwrap(await createTakeInChargeSegnalazioneUseCase(deps)({ actor: manager, id: REPORT_ID }));
    unwrap(await createChangeSegnalazioneStatusUseCase(deps)({
      actor: manager,
      id: REPORT_ID,
      status: StatoSegnalazione.InLavorazione,
    }));
    unwrap(await createAddCommentUseCase(deps)({
      actor: manager,
      id: REPORT_ID,
      text: "Commento operativo reale.",
    }));
    unwrap(await createRequestIntegrationUseCase(deps)({
      actor: manager,
      id: REPORT_ID,
      reason: "Serve integrazione dal segnalatore.",
    }));
    unwrap(await createIntegrateSegnalazioneUseCase(deps)({
      actor: reporter,
      id: REPORT_ID,
      text: "Integrazione fornita dal segnalatore.",
    }));
    unwrap(await createResolveSegnalazioneUseCase(deps)({
      actor: manager,
      id: REPORT_ID,
      resolution: "Anomalia risolta.",
    }));
    const acknowledgement = unwrap(await createAcknowledgeSegnalazioneUseCase(deps)({
      actor: reporter,
      id: REPORT_ID,
    }));
    unwrap(await createCloseSegnalazioneUseCase(deps)({
      actor: manager,
      id: REPORT_ID,
      note: "Chiusura verificata.",
    }));

    const finalReport = await repository.findById(REPORT_ID, TENANT_ID);
    expect(finalReport?.status).toBe(StatoSegnalazione.Chiusa);
    expect(finalReport?.closedAt).toBeDefined();
    expect(finalReport?.comments?.map((comment) => comment.testo)).toEqual([
      "Commento operativo reale.",
      "Integrazione fornita dal segnalatore.",
    ]);
    expect(finalReport?.workflow?.map((event) => event.statoA)).toEqual([
      StatoSegnalazione.PresaInCarico,
      StatoSegnalazione.InLavorazione,
      StatoSegnalazione.RichiestaIntegrazione,
      StatoSegnalazione.Integrata,
      StatoSegnalazione.Risolta,
      StatoSegnalazione.Chiusa,
    ]);

    const acknowledgements = await repository.listAcknowledgements(REPORT_ID, TENANT_ID);
    expect(acknowledgements).toHaveLength(1);
    expect(acknowledgements[0]).toMatchObject({
      id: acknowledgement.id,
      userId: reporter.userId,
      personId: reporter.personId,
    });
    expect(await repository.hasAcknowledgement(REPORT_ID, reporter.userId, TENANT_ID)).toBe(true);

    const rawComments = await db
      .select()
      .from(segnalazioneComments)
      .where(inArray(segnalazioneComments.tenantId, [TENANT_ID]));
    const rawWorkflow = await db
      .select()
      .from(segnalazioneWorkflowEvents)
      .where(inArray(segnalazioneWorkflowEvents.tenantId, [TENANT_ID]));
    const rawAcknowledgements = await db
      .select()
      .from(segnalazioneAcknowledgements)
      .where(inArray(segnalazioneAcknowledgements.tenantId, [TENANT_ID]));

    expect(rawComments).toHaveLength(2);
    expect(rawWorkflow).toHaveLength(6);
    expect(rawAcknowledgements).toHaveLength(1);
    expect(deps.audit.events.map((event) => event.type)).toContain("SEGNALAZIONE_CLOSED");
    expect(deps.notification.events.map((event) => event.type)).toContain("SEGNALAZIONE_ACKNOWLEDGED");
  });
});
