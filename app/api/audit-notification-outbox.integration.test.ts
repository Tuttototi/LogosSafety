import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  auditLogEntries,
  notificationOutbox,
  segnalazioneAcknowledgements,
  segnalazioneAttachments,
  segnalazioneComments,
  segnalazioneWorkflowEvents,
  segnalazioni,
} from "@db/schema";
import * as schema from "@db/schema";
import {
  DrizzleAuditLogRepository,
  SegnalazioniAuditPort,
} from "@/modules/audit";
import {
  DrizzleNotificationOutboxRepository,
  SegnalazioniNotificationOutboxPort,
} from "@/modules/notifications";
import {
  ApplicationErrorCode,
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
import { DrizzleTransactionCoordinator } from "@/modules/shared/infrastructure/drizzle/TransactionContext";

const integrationEnabled = process.env.AUDIT_NOTIFICATION_MYSQL_INTEGRATION === "1";
const describeIntegration = integrationEnabled ? describe : describe.skip;

const TENANT_ID = "it-aob-main";
const FAILURE_AUDIT_TENANT_ID = "it-aob-fa";
const FAILURE_OUTBOX_TENANT_ID = "it-aob-fo";
const INVALID_TENANT_ID = "it-aob-invalid";
const COMPANY_ID = "it-aob-company";
const TEST_TENANTS = [
  TENANT_ID,
  FAILURE_AUDIT_TENANT_ID,
  FAILURE_OUTBOX_TENANT_ID,
  INVALID_TENANT_ID,
];

let pool: Pool;
let db: MySql2Database<typeof schema>;
let segnalazioniRepository: DrizzleSegnalazioniRepository;
let auditRepository: DrizzleAuditLogRepository;
let notificationRepository: DrizzleNotificationOutboxRepository;
let coordinator: DrizzleTransactionCoordinator;

class TestClock implements ClockPort {
  private tick = 0;

  now(): string {
    this.tick += 1;
    return new Date(Date.UTC(2026, 6, 12, 9, this.tick, 0)).toISOString();
  }
}

class TestIds implements IdGeneratorPort {
  private readonly counters = new Map<string, number>();
  private readonly prefix: string;

  constructor(prefix = "it-audit-outbox") {
    this.prefix = prefix;
  }

  nextId(entity = "id"): string {
    const next = (this.counters.get(entity) ?? 0) + 1;
    this.counters.set(entity, next);
    return `${this.prefix}-${entity}-${next}`;
  }

  nextCode(prefix = "SEG"): string {
    const next = (this.counters.get("code") ?? 0) + 1;
    this.counters.set("code", next);
    return `${prefix}-AOB-${next}`;
  }
}

class ThrowingAuditPort implements AuditPort {
  async record(event: ApplicationEvent): Promise<void> {
    void event;
    throw new Error("forced audit persistence failure");
  }
}

class ThrowingNotificationPort implements NotificationPort {
  async notify(event: ApplicationEvent): Promise<void> {
    void event;
    throw new Error("forced outbox persistence failure");
  }
}

function requireLocalDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for audit/outbox MySQL integration tests");

  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error("Audit/outbox integration tests require a local database host");
  }
  if ((parsed.port || "3306") !== "3306") {
    throw new Error("Audit/outbox integration tests require local port 3306");
  }
  if (parsed.pathname.replace("/", "") !== "logos_safety") {
    throw new Error("Audit/outbox integration tests require the logos_safety database");
  }

  return databaseUrl;
}

function makeScope(tenantId = TENANT_ID): OrganizationalScope {
  return {
    tenantId,
    companyId: COMPANY_ID,
    contractId: "it-audit-outbox-contract",
    siteId: "it-audit-outbox-site",
    plantId: "it-audit-outbox-plant",
    areaId: "it-audit-outbox-area",
  };
}

function makeActor(
  role: SegnalazioniRole,
  tenantId = TENANT_ID,
  overrides: Partial<ApplicationActor> = {},
): ApplicationActor {
  const scope = makeScope(tenantId);
  const isReporter = role === SegnalazioniRole.Segnalatore;
  return {
    userId: isReporter ? `it-audit-outbox-reporter-${tenantId}` : `it-audit-outbox-manager-${tenantId}`,
    personId: isReporter ? `it-audit-outbox-reporter-person-${tenantId}` : `it-audit-outbox-manager-person-${tenantId}`,
    firstName: isReporter ? "Reporter" : "Manager",
    lastName: "AuditOutbox",
    email: `${role}@audit-outbox.example.test`,
    tenantId,
    companyId: COMPANY_ID,
    role,
    active: true,
    organizationalScope: scope,
    assignedScopes: [scope],
    ...overrides,
  };
}

async function cleanupTestData(): Promise<void> {
  await db.delete(notificationOutbox).where(inArray(notificationOutbox.tenantId, TEST_TENANTS));
  await db.delete(auditLogEntries).where(inArray(auditLogEntries.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneAcknowledgements).where(inArray(segnalazioneAcknowledgements.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneAttachments).where(inArray(segnalazioneAttachments.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneComments).where(inArray(segnalazioneComments.tenantId, TEST_TENANTS));
  await db.delete(segnalazioneWorkflowEvents).where(inArray(segnalazioneWorkflowEvents.tenantId, TEST_TENANTS));
  await db.delete(segnalazioni).where(inArray(segnalazioni.tenantId, TEST_TENANTS));
}

function makeDeps(
  ids: IdGeneratorPort,
  audit: AuditPort = new SegnalazioniAuditPort(auditRepository, ids),
  notification: NotificationPort = new SegnalazioniNotificationOutboxPort(notificationRepository, ids),
): SegnalazioniUseCaseDependencies {
  return {
    repository: segnalazioniRepository,
    audit,
    notification,
    clock: new TestClock(),
    ids,
  };
}

async function runMutation<T>(
  ids: IdGeneratorPort,
  operation: () => Promise<T>,
): Promise<T> {
  return coordinator.run(ids.nextId("correlation"), operation);
}

function unwrap<T>(result: { success: true; data: T } | { success: false; error: unknown }): T {
  if (!result.success) throw new Error(`Unexpected application error: ${JSON.stringify(result.error)}`);
  return result.data;
}

async function listAuditRows(tenantId = TENANT_ID) {
  return db
    .select()
    .from(auditLogEntries)
    .where(eq(auditLogEntries.tenantId, tenantId))
    .orderBy(asc(auditLogEntries.occurredAt), asc(auditLogEntries.createdAt), asc(auditLogEntries.id));
}

async function listOutboxRows(tenantId = TENANT_ID) {
  return db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.tenantId, tenantId))
    .orderBy(asc(notificationOutbox.occurredAt), asc(notificationOutbox.createdAt), asc(notificationOutbox.id));
}

describeIntegration("Audit Log and Notification Outbox MySQL integration", () => {
  beforeAll(async () => {
    pool = mysql.createPool(requireLocalDatabaseUrl());
    db = drizzle(pool, { schema, mode: "default" });
    segnalazioniRepository = new DrizzleSegnalazioniRepository(db);
    auditRepository = new DrizzleAuditLogRepository(db);
    notificationRepository = new DrizzleNotificationOutboxRepository(db);
    coordinator = new DrizzleTransactionCoordinator(db);
    await cleanupTestData();
  });

  afterAll(async () => {
    if (db) await cleanupTestData();
    if (pool) await pool.end();
  });

  it("persists segnalazioni audit entries and notification outbox records transactionally", async () => {
    const ids = new TestIds("it-audit-outbox-success");
    const deps = makeDeps(ids);
    const reporter = makeActor(SegnalazioniRole.Segnalatore);
    const manager = makeActor(SegnalazioniRole.ResponsabileSicurezza);

    const created = unwrap(await runMutation(
      ids,
      () => createCreateSegnalazioneUseCase(deps)({
        actor: reporter,
        title: "Audit outbox workflow",
        description: "Segnalazione creata dal test audit/outbox.",
        priority: PrioritaSegnalazione.Alta,
        severity: GravitaSegnalazione.Alta,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
        organizationalScope: makeScope(),
      }),
    ));

    unwrap(await runMutation(ids, () => createTakeInChargeSegnalazioneUseCase(deps)({
      actor: manager,
      id: created.id,
    })));
    unwrap(await runMutation(ids, () => createChangeSegnalazioneStatusUseCase(deps)({
      actor: manager,
      id: created.id,
      status: StatoSegnalazione.InLavorazione,
    })));
    const comment = unwrap(await runMutation(ids, () => createAddCommentUseCase(deps)({
      actor: manager,
      id: created.id,
      text: "Commento operativo da non duplicare in audit.",
    })));
    unwrap(await runMutation(ids, () => createRequestIntegrationUseCase(deps)({
      actor: manager,
      id: created.id,
      reason: "Serve integrazione da non duplicare in audit.",
    })));
    unwrap(await runMutation(ids, () => createIntegrateSegnalazioneUseCase(deps)({
      actor: reporter,
      id: created.id,
      text: "Integrazione fornita dal segnalatore.",
    })));
    unwrap(await runMutation(ids, () => createResolveSegnalazioneUseCase(deps)({
      actor: manager,
      id: created.id,
      resolution: "Risoluzione da non duplicare in audit.",
    })));
    unwrap(await runMutation(ids, () => createAcknowledgeSegnalazioneUseCase(deps)({
      actor: reporter,
      id: created.id,
    })));

    const auditBeforeDuplicateAck = await listAuditRows();
    const outboxBeforeDuplicateAck = await listOutboxRows();
    unwrap(await runMutation(ids, () => createAcknowledgeSegnalazioneUseCase(deps)({
      actor: reporter,
      id: created.id,
    })));
    expect(await listAuditRows()).toHaveLength(auditBeforeDuplicateAck.length);
    expect(await listOutboxRows()).toHaveLength(outboxBeforeDuplicateAck.length);

    unwrap(await runMutation(ids, () => createCloseSegnalazioneUseCase(deps)({
      actor: manager,
      id: created.id,
      note: "Chiusura da non duplicare in audit.",
    })));

    const auditRows = await listAuditRows();
    const outboxRows = await listOutboxRows();

    expect(auditRows.map((entry) => entry.eventType)).toEqual([
      "segnalazione_created",
      "segnalazione_taken_in_charge",
      "segnalazione_status_changed",
      "segnalazione_comment_added",
      "segnalazione_integration_requested",
      "segnalazione_integrated",
      "segnalazione_resolved",
      "segnalazione_acknowledged",
      "segnalazione_closed",
    ]);
    expect(outboxRows.map((entry) => entry.eventType)).toEqual([
      "segnalazione_created",
      "segnalazione_taken_in_charge",
      "segnalazione_comment_added",
      "segnalazione_integration_requested",
      "segnalazione_integrated",
      "segnalazione_resolved",
      "segnalazione_closed",
    ]);

    const commentAudit = auditRows.find((entry) => entry.eventType === "segnalazione_comment_added");
    expect(commentAudit?.metadata).toEqual({ commentId: comment.id });
    expect(JSON.stringify(commentAudit?.metadata)).not.toContain("Commento operativo");

    const commentOutbox = outboxRows.find((entry) => entry.eventType === "segnalazione_comment_added");
    expect(JSON.stringify(commentOutbox?.payload)).not.toContain("Commento operativo");
    expect(commentOutbox?.payload).toMatchObject({
      entityId: comment.id,
      eventType: "segnalazione_comment_added",
      futureAudienceType: "authorized_participants",
    });

    for (const outbox of outboxRows) {
      const matchingAudit = auditRows.find(
        (entry) => entry.eventType === outbox.eventType && entry.entityId === outbox.entityId,
      );
      expect(matchingAudit?.correlationId).toBe(outbox.correlationId);
    }

    const pending = await notificationRepository.findPending({
      now: "2030-01-01T00:00:00.000Z",
      limit: 20,
    });
    expect(pending.map((entry) => entry.id)).toEqual(outboxRows.map((entry) => entry.id));

    const transitionTarget = pending[0];
    if (!transitionTarget) throw new Error("Expected at least one pending outbox record");
    await notificationRepository.markProcessing(transitionTarget.id);
    let transitionRows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.id, transitionTarget.id));
    expect(transitionRows[0]?.status).toBe("processing");
    expect(transitionRows[0]?.attempts).toBe(1);

    await notificationRepository.markProcessed(transitionTarget.id, "2026-07-12T10:00:00.000Z");
    transitionRows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.id, transitionTarget.id));
    expect(transitionRows[0]?.status).toBe("processed");
    expect(transitionRows[0]?.processedAt).toBeTruthy();

    const failedTarget = pending[1];
    if (!failedTarget) throw new Error("Expected a second pending outbox record");
    await notificationRepository.markFailed(failedTarget.id, "TEST_FAILURE_WITHOUT_STACK");
    transitionRows = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.id, failedTarget.id));
    expect(transitionRows[0]?.status).toBe("failed");
    expect(transitionRows[0]?.lastErrorCode).toBe("TEST_FAILURE_WITHOUT_STACK");
  });

  it("does not persist mutation, audit or outbox when validation fails before commit", async () => {
    const ids = new TestIds("it-audit-outbox-invalid");
    const deps = makeDeps(ids);
    const result = await runMutation(
      ids,
      () => createCreateSegnalazioneUseCase(deps)({
        actor: makeActor(SegnalazioniRole.Segnalatore, INVALID_TENANT_ID),
        title: " ",
        description: "Descrizione valida",
        priority: PrioritaSegnalazione.Media,
        severity: GravitaSegnalazione.Media,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
        organizationalScope: makeScope(INVALID_TENANT_ID),
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe(ApplicationErrorCode.ValidationError);
    expect(await listAuditRows(INVALID_TENANT_ID)).toHaveLength(0);
    expect(await listOutboxRows(INVALID_TENANT_ID)).toHaveLength(0);
    const rows = await db
      .select()
      .from(segnalazioni)
      .where(eq(segnalazioni.tenantId, INVALID_TENANT_ID));
    expect(rows).toHaveLength(0);
  });

  it("rolls back the mutation when audit persistence fails", async () => {
    const ids = new TestIds("it-audit-outbox-fail-audit");
    const deps = makeDeps(ids, new ThrowingAuditPort());
    const actor = makeActor(SegnalazioniRole.Segnalatore, FAILURE_AUDIT_TENANT_ID);

    await expect(runMutation(
      ids,
      () => createCreateSegnalazioneUseCase(deps)({
        actor,
        title: "Rollback audit",
        description: "La segnalazione deve essere rollbackata.",
        priority: PrioritaSegnalazione.Media,
        severity: GravitaSegnalazione.Media,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
        organizationalScope: makeScope(FAILURE_AUDIT_TENANT_ID),
      }),
    )).rejects.toThrow("forced audit persistence failure");

    const rows = await db
      .select()
      .from(segnalazioni)
      .where(eq(segnalazioni.tenantId, FAILURE_AUDIT_TENANT_ID));
    expect(rows).toHaveLength(0);
    expect(await listAuditRows(FAILURE_AUDIT_TENANT_ID)).toHaveLength(0);
    expect(await listOutboxRows(FAILURE_AUDIT_TENANT_ID)).toHaveLength(0);
  });

  it("rolls back the mutation and audit entry when outbox persistence fails", async () => {
    const ids = new TestIds("it-audit-outbox-fail-outbox");
    const deps = makeDeps(ids, new SegnalazioniAuditPort(auditRepository, ids), new ThrowingNotificationPort());
    const actor = makeActor(SegnalazioniRole.Segnalatore, FAILURE_OUTBOX_TENANT_ID);

    await expect(runMutation(
      ids,
      () => createCreateSegnalazioneUseCase(deps)({
        actor,
        title: "Rollback outbox",
        description: "La segnalazione e audit devono essere rollbackati.",
        priority: PrioritaSegnalazione.Media,
        severity: GravitaSegnalazione.Media,
        category: CategoriaSegnalazione.Sicurezza,
        type: TipoSegnalazione.Pericolo,
        organizationalScope: makeScope(FAILURE_OUTBOX_TENANT_ID),
      }),
    )).rejects.toThrow("forced outbox persistence failure");

    const rows = await db
      .select()
      .from(segnalazioni)
      .where(eq(segnalazioni.tenantId, FAILURE_OUTBOX_TENANT_ID));
    expect(rows).toHaveLength(0);
    expect(await listAuditRows(FAILURE_OUTBOX_TENANT_ID)).toHaveLength(0);
    expect(await listOutboxRows(FAILURE_OUTBOX_TENANT_ID)).toHaveLength(0);
  });

  it("keeps audit queries tenant-safe", async () => {
    const tenantAEntries = await auditRepository.listByEntity({
      tenantId: TENANT_ID,
      module: "segnalazioni",
      entityType: "Segnalazione",
      entityId: "missing-in-other-tenant",
    });
    const otherTenantEntries = await auditRepository.listByCorrelationId({
      tenantId: FAILURE_AUDIT_TENANT_ID,
      correlationId: "missing",
    });
    const actorEntries = await auditRepository.listByActor({
      tenantId: TENANT_ID,
      actorUserId: `it-audit-outbox-manager-${TENANT_ID}`,
      limit: 20,
    });

    expect(tenantAEntries).toHaveLength(0);
    expect(otherTenantEntries).toHaveLength(0);
    expect(actorEntries.every((entry) => entry.tenantId === TENANT_ID)).toBe(true);
  });

  it("keeps tenant cleanup scoped to test identifiers", async () => {
    const rows = await db
      .select({ id: segnalazioni.id })
      .from(segnalazioni)
      .where(and(eq(segnalazioni.tenantId, TENANT_ID), isNull(segnalazioni.deletedAt)));
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});
