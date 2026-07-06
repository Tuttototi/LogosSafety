import { z } from "zod";
import { createRouter, operatoreQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import { workers, medicalVisits } from "@db/schema";
import { eq, and, like, or } from "drizzle-orm";

export const workersRouter = createRouter({
  list: operatoreQuery
    .input(z.object({ search: z.string().optional(), companyId: z.number().optional(), siteId: z.number().optional(), jobRoleId: z.number().optional(), status: z.enum(["attivo", "cessato", "sospeso"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [eq(workers.active, true)];
      if (input?.status) conditions.push(eq(workers.status, input.status));
      if (input?.companyId) conditions.push(eq(workers.companyId, input.companyId));
      if (input?.siteId) conditions.push(eq(workers.siteId, input.siteId));
      if (input?.jobRoleId) conditions.push(eq(workers.jobRoleId, input.jobRoleId));
      if (input?.search) {
        const s = `%${input.search}%`;
        conditions.push(or(like(workers.firstName, s), like(workers.lastName, s), like(workers.fiscalCode, s))!);
      }
      return db.query.workers.findMany({
        where: and(...conditions),
        with: { company: true, site: true, jobRole: true },
        orderBy: [workers.lastName, workers.firstName],
      });
    }),

  getById: operatoreQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    return db.query.workers.findFirst({
      where: eq(workers.id, input.id),
      with: {
        company: true, site: true,
        jobRole: { with: { jobRoleRisks: { with: { risk: true } }, jobRoleTraining: { with: { trainingType: true } } } },
        trainingCertificates: { with: { course: { with: { trainingType: true } } } },
        medicalVisits: {
          columns: {
            id: true,
            workerId: true,
            visitType: true,
            requestDate: true,
            scheduledDate: true,
            visitDate: true,
            nextVisitDue: true,
            requestStatus: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [medicalVisits.createdAt],
        },
      },
    });
  }),

  create: operatoreQuery
    .input(z.object({ firstName: z.string().min(1), lastName: z.string().min(1), fiscalCode: z.string().optional(), companyId: z.number(), siteId: z.number().optional(), jobRoleId: z.number(), hireDate: z.string().optional(), status: z.enum(["attivo", "cessato", "sospeso"]).default("attivo"), requiresMedicalVisit: z.boolean().default(false), email: z.string().email().optional(), phone: z.string().optional(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(workers).values({
        ...input, hireDate: input.hireDate || null, siteId: input.siteId || null,
        fiscalCode: input.fiscalCode || null, email: input.email || null,
        phone: input.phone || null, notes: input.notes || null, createdBy: ctx.user.id,
      });
      await logAudit(ctx, "create", "workers", { entityName: `${input.firstName} ${input.lastName}`, module: "dipendenti" });
      return result;
    }),

  update: operatoreQuery
    .input(z.object({ id: z.number(), firstName: z.string().min(1).optional(), lastName: z.string().min(1).optional(), fiscalCode: z.string().optional(), companyId: z.number().optional(), siteId: z.number().optional(), jobRoleId: z.number().optional(), hireDate: z.string().optional(), status: z.enum(["attivo", "cessato", "sospeso"]).optional(), requiresMedicalVisit: z.boolean().optional(), email: z.string().email().optional(), phone: z.string().optional(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) updateData[key] = value === "" ? null : value;
      }
      updateData.updatedBy = ctx.user.id;
      const result = await db.update(workers).set(updateData).where(eq(workers.id, id));
      await logAudit(ctx, "update", "workers", { entityId: id, module: "dipendenti" });
      return result;
    }),

  delete: operatoreQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    await db.update(workers).set({ active: false, deletedAt: new Date(), deletedBy: ctx.user.id }).where(eq(workers.id, input.id));
    await logAudit(ctx, "delete", "workers", { entityId: input.id, module: "dipendenti" });
    return { success: true };
  }),
});
