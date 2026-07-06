import { z } from "zod";
import { createRouter, auditorQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs } from "@db/schema";
import { eq, desc, gte, lte, and } from "drizzle-orm";

type AuditAction = typeof auditLogs.$inferSelect.action;

export const auditRouter = createRouter({
  list: auditorQuery
    .input(z.object({
      userId: z.number().optional(),
      action: z.string().optional(),
      module: z.string().optional(),
      entityType: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().default(100),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.userId) conditions.push(eq(auditLogs.userId, input.userId));
      if (input?.action) conditions.push(eq(auditLogs.action, input.action as AuditAction));
      if (input?.module) conditions.push(eq(auditLogs.module, input.module));
      if (input?.entityType) conditions.push(eq(auditLogs.entityType, input.entityType));
      if (input?.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo) conditions.push(lte(auditLogs.createdAt, new Date(input.dateTo)));

      return db.query.auditLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(auditLogs.createdAt)],
        limit: input?.limit ?? 100,
      });
    }),
});
