import { z } from "zod";
import { createRouter, anyAuthedQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import { documents, workers } from "@db/schema";
import {
  and,
  desc,
  eq,
  inArray,
  not,
  or,
  sql,
} from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  canAccessDocument,
  canManageDocument,
  getRestrictedDocumentClasses,
  HEALTH_DOCUMENT_TYPES,
  IDENTITY_DOCUMENT_TYPES,
} from "./document-access";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
type DocumentEntityType = typeof documents.$inferSelect.entityType;
type DocumentType = typeof documents.$inferSelect.documentType;

export const documentMetadataSelection = {
  id: documents.id,
  workerId: documents.workerId,
  entityType: documents.entityType,
  entityId: documents.entityId,
  documentType: documents.documentType,
  title: documents.title,
  fileName: documents.fileName,
  fileSize: documents.fileSize,
  mimeType: documents.mimeType,
  version: documents.version,
  expiryDate: documents.expiryDate,
  status: documents.status,
  createdAt: documents.createdAt,
  createdBy: documents.createdBy,
  hasContent:
    sql<number>`case when ${documents.fileUrl} is null then 0 else 1 end`.mapWith(
      Number
    ),
  workerRecordId: workers.id,
  workerFirstName: workers.firstName,
  workerLastName: workers.lastName,
};

export const documentRouter = createRouter({
  // Metadata only: fileUrl/content is intentionally excluded.
  list: anyAuthedQuery
    .input(
      z
        .object({
          workerId: z.number().optional(),
          entityType: z
            .enum([
              "dipendente",
              "corso",
              "attestato",
              "visita_medica",
              "mansione",
              "commessa",
              "azienda",
              "generale",
            ])
            .optional(),
          documentType: z
            .enum([
              "attestato",
              "giudizio_idoneita",
              "lettera_incarico",
              "consegna_dpi",
              "verbale_addestramento",
              "richiesta_verifica",
              "email",
              "contratto",
              "cartella_clinica",
              "documento_identita",
              "patente",
              "altro",
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [eq(documents.active, true)];
      const requestedDescriptor = {
        entityType: input?.entityType ?? "generale",
        documentType: input?.documentType ?? "altro",
      } satisfies {
        entityType: DocumentEntityType;
        documentType: DocumentType;
      };
      if (
        (input?.entityType || input?.documentType) &&
        !canAccessDocument(ctx.user.role, requestedDescriptor)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Non autorizzato ad accedere a questa categoria di documenti",
        });
      }

      const restricted = getRestrictedDocumentClasses(ctx.user.role);
      if (restricted.health) {
        conditions.push(
          not(
            or(
              inArray(documents.documentType, [...HEALTH_DOCUMENT_TYPES]),
              eq(documents.entityType, "visita_medica")
            )!
          )
        );
      }
      if (restricted.identity) {
        conditions.push(
          not(inArray(documents.documentType, [...IDENTITY_DOCUMENT_TYPES]))
        );
      }
      if (input?.workerId) conditions.push(eq(documents.workerId, input.workerId));
      if (input?.entityType)
        conditions.push(eq(documents.entityType, input.entityType));
      if (input?.documentType)
        conditions.push(eq(documents.documentType, input.documentType));

      const rows = await db
        .select(documentMetadataSelection)
        .from(documents)
        .leftJoin(workers, eq(documents.workerId, workers.id))
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt))
        .limit(200);

      return rows.map(row => ({
        id: row.id,
        workerId: row.workerId,
        entityType: row.entityType,
        entityId: row.entityId,
        documentType: row.documentType,
        title: row.title,
        fileName: row.fileName,
        fileSize: row.fileSize,
        mimeType: row.mimeType,
        version: row.version,
        expiryDate: row.expiryDate,
        status: row.status,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
        hasContent: Boolean(row.hasContent),
        worker: row.workerRecordId
          ? {
              id: row.workerRecordId,
              firstName: row.workerFirstName,
              lastName: row.workerLastName,
            }
          : null,
      }));
    }),

  access: anyAuthedQuery
    .input(
      z.object({
        id: z.number(),
        intent: z.enum(["view", "download"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db
        .select({
          id: documents.id,
          entityType: documents.entityType,
          documentType: documents.documentType,
          title: documents.title,
          fileName: documents.fileName,
          mimeType: documents.mimeType,
        })
        .from(documents)
        .where(and(eq(documents.id, input.id), eq(documents.active, true)))
        .limit(1);
      const document = result[0];
      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Documento non trovato",
        });
      }
      if (!canAccessDocument(ctx.user.role, document)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Non autorizzato ad accedere a questo documento",
        });
      }

      const contentResult = await db
        .select({ fileUrl: documents.fileUrl })
        .from(documents)
        .where(and(eq(documents.id, document.id), eq(documents.active, true)))
        .limit(1);
      const fileUrl = contentResult[0]?.fileUrl;
      if (!fileUrl) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contenuto del documento non disponibile",
        });
      }

      await logAudit(ctx, input.intent, "documents", {
        entityId: document.id,
        entityName: document.title,
        module: "documenti",
        reason:
          input.intent === "view"
            ? "Apertura documento"
            : "Download documento",
      });

      return {
        content: fileUrl,
        fileName: document.fileName,
        mimeType: document.mimeType,
      };
    }),

  create: anyAuthedQuery
    .input(z.object({
      workerId: z.number().optional(),
      entityType: z.enum(["dipendente", "corso", "attestato", "visita_medica", "mansione", "commessa", "azienda", "generale"]),
      entityId: z.number().optional(),
      documentType: z.enum(["attestato", "giudizio_idoneita", "lettera_incarico", "consegna_dpi", "verbale_addestramento", "richiesta_verifica", "email", "contratto", "cartella_clinica", "documento_identita", "patente", "altro"]),
      title: z.string().min(1),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
      fileSize: z.number().max(MAX_FILE_SIZE, "File troppo grande: massimo 10MB").optional(),
      mimeType: z.string().optional(),
      expiryDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!canManageDocument(ctx.user.role, input)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Non autorizzato a creare questa categoria di documenti",
        });
      }
      // Validate real content size, not just client-reported fileSize
      if (input.fileUrl && input.fileUrl.length > MAX_FILE_SIZE * 1.4) {
        // base64 ~ 1.37x overhead
        throw new Error(`Contenuto file troppo grande. Massimo: 10MB.`);
      }
      const db = getDb();
      const result = await db.insert(documents).values({
        workerId: input.workerId || null,
        entityId: input.entityId || null,
        entityType: input.entityType,
        documentType: input.documentType,
        title: input.title,
        fileUrl: input.fileUrl || null,
        fileName: input.fileName || null,
        fileSize: input.fileSize || null,
        mimeType: input.mimeType || null,
        expiryDate: input.expiryDate || null,
        notes: input.notes || null,
        createdBy: ctx.user.id,
      });
      await logAudit(ctx, "create", "documents", { entityName: input.title, module: "documenti" });
      return result;
    }),

  delete: anyAuthedQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const result = await db
      .select({
        id: documents.id,
        entityType: documents.entityType,
        documentType: documents.documentType,
      })
      .from(documents)
      .where(and(eq(documents.id, input.id), eq(documents.active, true)))
      .limit(1);
    const document = result[0];
    if (!document) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento non trovato",
      });
    }
    if (!canManageDocument(ctx.user.role, document)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Non autorizzato a eliminare questo documento",
      });
    }
    await db.update(documents).set({ active: false }).where(eq(documents.id, input.id));
    await logAudit(ctx, "delete", "documents", { entityId: input.id, module: "documenti" });
    return { success: true };
  }),
});
