import { and, asc, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import {
  segnalazioneAcknowledgements,
  segnalazioneAttachments,
  segnalazioneComments,
  segnalazioneWorkflowEvents,
  segnalazioni,
  type SegnalazioneRecord,
} from "@db/schema";
import * as schema from "@db/schema";
import {
  SegnalazioniRole,
  type Allegato,
  type Commento,
  type DomainId,
  type Segnalazione,
} from "../../domain";
import {
  getActiveDrizzleDatabase,
  hasActiveDrizzleTransaction,
} from "@/modules/shared/infrastructure/drizzle/TransactionContext";
import type {
  AcknowledgementRecord,
  ListVisibleByScopeContext,
  SegnalazioniRepository,
} from "../../application";
import { SegnalazioniPersistenceError } from "./errors";
import {
  mapAcknowledgementToInsert,
  mapAcknowledgementRowToApplication,
  mapAttachmentRowToDomain,
  mapAttachmentToInsert,
  mapCommentRowToDomain,
  mapCommentToInsert,
  mapSegnalazioneRowToDomain,
  mapSegnalazioneToInsert,
  mapSegnalazioneToUpdate,
  mapWorkflowEventRowToDomain,
  mapWorkflowEventToInsert,
} from "./mappers";

export type SegnalazioniDrizzleDatabase = MySql2Database<typeof schema>;

const SELF_VIEW_ROLES = new Set<string>([
  SegnalazioniRole.Segnalatore,
  SegnalazioniRole.Dipendente,
  SegnalazioniRole.Operatore,
]);

const CAPO_IMPIANTO_ROLE = SegnalazioniRole.CapoImpianto;

function whereAll(filters: SQL[]): SQL | undefined {
  return filters.length ? and(...filters) : undefined;
}

function compact<T>(values: readonly (T | null | undefined)[]): T[] {
  return values.filter((value): value is T => value !== null && value !== undefined);
}

export function buildSegnalazioniListFilters(context: ListVisibleByScopeContext): SQL[] {
  const { actor, organizationalScope } = context;
  const filters: SQL[] = [isNull(segnalazioni.deletedAt)];
  const tenantId = actor.canAccessAllTenants === true
    ? (organizationalScope?.tenantId ?? actor.tenantId)
    : actor.tenantId;
  const companyId = organizationalScope?.companyId ?? actor.companyId;

  filters.push(eq(segnalazioni.tenantId, tenantId));
  filters.push(eq(segnalazioni.companyId, companyId));

  if (organizationalScope?.contractId) {
    filters.push(eq(segnalazioni.contractId, organizationalScope.contractId));
  }

  if (organizationalScope?.siteId) {
    filters.push(eq(segnalazioni.siteId, organizationalScope.siteId));
  }

  if (organizationalScope?.plantId) {
    filters.push(eq(segnalazioni.plantId, organizationalScope.plantId));
  }

  if (organizationalScope?.areaId) {
    filters.push(eq(segnalazioni.areaId, organizationalScope.areaId));
  }

  if (SELF_VIEW_ROLES.has(actor.role)) {
    const selfFilter = or(
      eq(segnalazioni.createdByUserId, actor.userId),
      eq(segnalazioni.createdByPersonId, actor.personId),
      eq(segnalazioni.reporterUserId, actor.userId),
      eq(segnalazioni.reporterPersonId, actor.personId),
    );

    if (selfFilter) filters.push(selfFilter);
  }

  if (actor.role === CAPO_IMPIANTO_ROLE && !organizationalScope?.plantId) {
    const plantIds = compact([
      actor.organizationalScope.plantId,
      ...(actor.assignedScopes ?? []).map((scope) => scope.plantId),
    ]);
    const plantScopeFilter = plantIds.length > 0
      ? or(
        eq(segnalazioni.createdByUserId, actor.userId),
        eq(segnalazioni.createdByPersonId, actor.personId),
        inArray(segnalazioni.plantId, plantIds),
      )
      : or(
        eq(segnalazioni.createdByUserId, actor.userId),
        eq(segnalazioni.createdByPersonId, actor.personId),
      );

    if (plantScopeFilter) filters.push(plantScopeFilter);
  }

  return filters;
}

export class DrizzleSegnalazioniRepository implements SegnalazioniRepository {
  private readonly db: SegnalazioniDrizzleDatabase;

  constructor(db: SegnalazioniDrizzleDatabase) {
    this.db = db;
  }

  private currentDb(): SegnalazioniDrizzleDatabase {
    return getActiveDrizzleDatabase(this.db) as SegnalazioniDrizzleDatabase;
  }

  private async runMutation<T>(
    operation: (db: SegnalazioniDrizzleDatabase) => Promise<T>,
  ): Promise<T> {
    if (hasActiveDrizzleTransaction()) {
      return operation(this.currentDb());
    }

    return this.db.transaction(async (tx) => operation(tx as unknown as SegnalazioniDrizzleDatabase));
  }

  async findById(id: DomainId, tenantId?: DomainId): Promise<Segnalazione | null> {
    const filters: SQL[] = [eq(segnalazioni.id, id), isNull(segnalazioni.deletedAt)];
    if (tenantId) filters.push(eq(segnalazioni.tenantId, tenantId));

    const rows = await this.currentDb()
      .select()
      .from(segnalazioni)
      .where(whereAll(filters))
      .limit(1);

    const row = rows.at(0);
    if (!row) return null;

    const hydrated = await this.hydrateReports([row]);
    return hydrated.at(0) ?? null;
  }

  async listVisibleByScope(context: ListVisibleByScopeContext): Promise<Segnalazione[]> {
    const rows = await this.currentDb()
      .select()
      .from(segnalazioni)
      .where(whereAll(buildSegnalazioniListFilters(context)))
      .orderBy(desc(segnalazioni.createdAt))
      .limit(200);

    return this.hydrateReports(rows);
  }

  async create(segnalazione: Segnalazione): Promise<void> {
    await this.runMutation(async (db) => {
      await db.insert(segnalazioni).values(mapSegnalazioneToInsert(segnalazione));

      const attachments = segnalazione.attachments ?? [];
      if (attachments.length > 0) {
        await db.insert(segnalazioneAttachments).values(
          attachments.map((attachment) => mapAttachmentToInsert(attachment, segnalazione)),
        );
      }

      const comments = segnalazione.comments ?? [];
      if (comments.length > 0) {
        await db.insert(segnalazioneComments).values(
          comments.map((comment) => mapCommentToInsert(comment, segnalazione)),
        );

        const commentAttachments = comments.flatMap((comment) =>
          (comment.allegati ?? []).map((attachment) =>
            mapAttachmentToInsert(attachment, segnalazione, comment.id),
          ),
        );

        if (commentAttachments.length > 0) {
          await db.insert(segnalazioneAttachments).values(commentAttachments);
        }
      }

      const workflow = segnalazione.workflow ?? [];
      if (workflow.length > 0) {
        await db.insert(segnalazioneWorkflowEvents).values(
          workflow.map((event) => mapWorkflowEventToInsert(event, segnalazione)),
        );
      }
    });
  }

  async update(segnalazione: Segnalazione): Promise<void> {
    await this.runMutation(async (db) => {
      await db
        .update(segnalazioni)
        .set(mapSegnalazioneToUpdate(segnalazione))
        .where(
          and(
            eq(segnalazioni.id, segnalazione.id),
            eq(segnalazioni.tenantId, segnalazione.tenantId),
            isNull(segnalazioni.deletedAt),
          ),
        );

      const workflow = segnalazione.workflow ?? [];
      if (workflow.length === 0) return;

      const workflowIds = workflow.map((event) => event.id);
      const existingEvents = await db
        .select({ id: segnalazioneWorkflowEvents.id })
        .from(segnalazioneWorkflowEvents)
        .where(inArray(segnalazioneWorkflowEvents.id, workflowIds));
      const existingEventIds = new Set(existingEvents.map((event) => event.id));
      const newEvents = workflow.filter((event) => !existingEventIds.has(event.id));

      if (newEvents.length > 0) {
        await db.insert(segnalazioneWorkflowEvents).values(
          newEvents.map((event) => mapWorkflowEventToInsert(event, segnalazione)),
        );
      }
    });
  }

  async addComment(comment: Commento): Promise<void> {
    const segnalazione = await this.findById(comment.segnalazioneId);
    if (!segnalazione) {
      throw new SegnalazioniPersistenceError("Cannot add comment to missing segnalazione", {
        segnalazioneId: comment.segnalazioneId,
      });
    }

    await this.runMutation(async (db) => {
      await db.insert(segnalazioneComments).values(mapCommentToInsert(comment, segnalazione));

      const attachments = comment.allegati ?? [];
      if (attachments.length > 0) {
        await db.insert(segnalazioneAttachments).values(
          attachments.map((attachment) => mapAttachmentToInsert(attachment, segnalazione, comment.id)),
        );
      }
    });
  }

  async saveAcknowledgement(acknowledgement: AcknowledgementRecord): Promise<void> {
    await this.currentDb()
      .insert(segnalazioneAcknowledgements)
      .values(mapAcknowledgementToInsert(acknowledgement));
  }

  async findAcknowledgement(
    segnalazioneId: DomainId,
    userId: DomainId,
    tenantId?: DomainId,
  ): Promise<AcknowledgementRecord | null> {
    const filters: SQL[] = [
      eq(segnalazioneAcknowledgements.segnalazioneId, segnalazioneId),
      eq(segnalazioneAcknowledgements.userId, userId),
    ];
    if (tenantId) filters.push(eq(segnalazioneAcknowledgements.tenantId, tenantId));

    const rows = await this.currentDb()
      .select()
      .from(segnalazioneAcknowledgements)
      .where(whereAll(filters))
      .limit(1);

    const row = rows.at(0);
    return row ? mapAcknowledgementRowToApplication(row) : null;
  }

  async listAcknowledgements(
    segnalazioneId: DomainId,
    tenantId?: DomainId,
  ): Promise<AcknowledgementRecord[]> {
    const filters: SQL[] = [
      eq(segnalazioneAcknowledgements.segnalazioneId, segnalazioneId),
    ];
    if (tenantId) filters.push(eq(segnalazioneAcknowledgements.tenantId, tenantId));

    const rows = await this.currentDb()
      .select()
      .from(segnalazioneAcknowledgements)
      .where(whereAll(filters))
      .orderBy(asc(segnalazioneAcknowledgements.acknowledgedAt));

    return rows.map(mapAcknowledgementRowToApplication);
  }

  async hasAcknowledgement(
    segnalazioneId: DomainId,
    userId: DomainId,
    tenantId?: DomainId,
  ): Promise<boolean> {
    return Boolean(await this.findAcknowledgement(segnalazioneId, userId, tenantId));
  }

  async existsByCode(code: string, tenantId?: DomainId): Promise<boolean> {
    const filters: SQL[] = [eq(segnalazioni.code, code), isNull(segnalazioni.deletedAt)];
    if (tenantId) filters.push(eq(segnalazioni.tenantId, tenantId));

    const rows = await this.currentDb()
      .select({ id: segnalazioni.id })
      .from(segnalazioni)
      .where(whereAll(filters))
      .limit(1);

    return rows.length > 0;
  }

  private async hydrateReports(rows: readonly SegnalazioneRecord[]): Promise<Segnalazione[]> {
    const reportIds = rows.map((row) => row.id);
    if (reportIds.length === 0) return [];

    const [commentRows, attachmentRows, workflowRows] = await Promise.all([
      this.currentDb()
        .select()
        .from(segnalazioneComments)
        .where(
          and(
            inArray(segnalazioneComments.segnalazioneId, reportIds),
            isNull(segnalazioneComments.deletedAt),
          ),
        )
        .orderBy(asc(segnalazioneComments.createdAt)),
      this.currentDb()
        .select()
        .from(segnalazioneAttachments)
        .where(
          and(
            inArray(segnalazioneAttachments.segnalazioneId, reportIds),
            isNull(segnalazioneAttachments.deletedAt),
          ),
        )
        .orderBy(asc(segnalazioneAttachments.createdAt)),
      this.currentDb()
        .select()
        .from(segnalazioneWorkflowEvents)
        .where(inArray(segnalazioneWorkflowEvents.segnalazioneId, reportIds))
        .orderBy(asc(segnalazioneWorkflowEvents.createdAt)),
    ]);

    const attachmentsByReport = new Map<string, Allegato[]>();
    const attachmentsByComment = new Map<string, Allegato[]>();

    for (const attachmentRow of attachmentRows) {
      const attachment = mapAttachmentRowToDomain(attachmentRow);
      if (attachment.commentoId) {
        const attachments = attachmentsByComment.get(attachment.commentoId) ?? [];
        attachments.push(attachment);
        attachmentsByComment.set(attachment.commentoId, attachments);
      } else {
        const attachments = attachmentsByReport.get(attachment.segnalazioneId ?? attachmentRow.segnalazioneId) ?? [];
        attachments.push(attachment);
        attachmentsByReport.set(attachment.segnalazioneId ?? attachmentRow.segnalazioneId, attachments);
      }
    }

    const commentsByReport = new Map<string, Commento[]>();
    for (const commentRow of commentRows) {
      const comment = mapCommentRowToDomain(commentRow, attachmentsByComment.get(commentRow.id) ?? []);
      const comments = commentsByReport.get(comment.segnalazioneId) ?? [];
      comments.push(comment);
      commentsByReport.set(comment.segnalazioneId, comments);
    }

    const workflowByReport = new Map<string, ReturnType<typeof mapWorkflowEventRowToDomain>[]>();
    for (const workflowRow of workflowRows) {
      const event = mapWorkflowEventRowToDomain(workflowRow);
      const workflow = workflowByReport.get(event.segnalazioneId) ?? [];
      workflow.push(event);
      workflowByReport.set(event.segnalazioneId, workflow);
    }

    return rows.map((row) =>
      mapSegnalazioneRowToDomain(
        row,
        attachmentsByReport.get(row.id) ?? [],
        commentsByReport.get(row.id) ?? [],
        workflowByReport.get(row.id) ?? [],
      ),
    );
  }
}
