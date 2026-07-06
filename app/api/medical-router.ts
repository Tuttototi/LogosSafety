import { z } from "zod";
import {
  createRouter,
  logAudit,
  medicalOperationalQuery,
  medicoQuery,
} from "./middleware";
import { getDb } from "./queries/connection";
import {
  companies,
  jobRoles,
  medicalVisits,
  sites,
  workers,
} from "@db/schema";
import { and, desc, eq } from "drizzle-orm";

const visitTypeSchema = z.enum([
  "preventiva",
  "preassuntiva",
  "periodica",
  "cambio_mansione",
  "richiesta_lavoratore",
  "rientro_malattia",
  "rientro_infortunio",
  "cessazione",
  "straordinaria",
]);

const requestStatusSchema = z.enum([
  "richiesta",
  "prenotata",
  "completata",
  "annullata",
]);

const judgmentSchema = z.enum([
  "idoneo",
  "idoneo_prescrizioni",
  "idoneo_limitazioni",
  "temp_non_idoneo",
  "non_idoneo",
]);

const listInputSchema = z
  .object({
    workerId: z.number().optional(),
    visitType: visitTypeSchema.optional(),
    requestStatus: requestStatusSchema.optional(),
  })
  .strict()
  .optional();

export const operationalMedicalVisitSelection = {
  id: medicalVisits.id,
  workerId: medicalVisits.workerId,
  visitType: medicalVisits.visitType,
  requestDate: medicalVisits.requestDate,
  scheduledDate: medicalVisits.scheduledDate,
  visitDate: medicalVisits.visitDate,
  nextVisitDue: medicalVisits.nextVisitDue,
  requestStatus: medicalVisits.requestStatus,
  createdAt: medicalVisits.createdAt,
  updatedAt: medicalVisits.updatedAt,
  workerFirstName: workers.firstName,
  workerLastName: workers.lastName,
  companyId: companies.id,
  companyName: companies.name,
  siteId: sites.id,
  siteName: sites.name,
  jobRoleId: jobRoles.id,
  jobRoleName: jobRoles.name,
};

function getListConditions(
  input: z.infer<typeof listInputSchema>
) {
  const conditions = [];
  if (input?.workerId) {
    conditions.push(eq(medicalVisits.workerId, input.workerId));
  }
  if (input?.visitType) {
    conditions.push(eq(medicalVisits.visitType, input.visitType));
  }
  if (input?.requestStatus) {
    conditions.push(eq(medicalVisits.requestStatus, input.requestStatus));
  }
  return conditions;
}

export const medicalRouter = createRouter({
  list: medicalOperationalQuery
    .input(listInputSchema)
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = getListConditions(input);
      const rows = await db
        .select(operationalMedicalVisitSelection)
        .from(medicalVisits)
        .innerJoin(workers, eq(medicalVisits.workerId, workers.id))
        .leftJoin(companies, eq(workers.companyId, companies.id))
        .leftJoin(sites, eq(workers.siteId, sites.id))
        .leftJoin(jobRoles, eq(workers.jobRoleId, jobRoles.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(medicalVisits.createdAt));

      return rows.map(row => ({
        id: row.id,
        workerId: row.workerId,
        visitType: row.visitType,
        requestDate: row.requestDate,
        scheduledDate: row.scheduledDate,
        visitDate: row.visitDate,
        nextVisitDue: row.nextVisitDue,
        requestStatus: row.requestStatus,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        worker: {
          id: row.workerId,
          firstName: row.workerFirstName,
          lastName: row.workerLastName,
          company: row.companyId
            ? { id: row.companyId, name: row.companyName }
            : null,
          site: row.siteId ? { id: row.siteId, name: row.siteName } : null,
          jobRole: row.jobRoleId
            ? { id: row.jobRoleId, name: row.jobRoleName }
            : null,
        },
      }));
    }),

  clinicalList: medicoQuery
    .input(listInputSchema)
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = getListConditions(input);
      const result = await db.query.medicalVisits.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          worker: {
            with: {
              company: true,
              site: true,
              jobRole: true,
            },
          },
        },
        orderBy: [desc(medicalVisits.createdAt)],
      });
      await logAudit(ctx, "view", "medical_visits", {
        module: "sorveglianza",
        reason: `Consultazione dati clinici: ${result.length} visite`,
      });
      return result;
    }),

  create: medicalOperationalQuery
    .input(
      z.object({
        workerId: z.number(),
        visitType: visitTypeSchema,
        requestDate: z.string().optional(),
        scheduledDate: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(medicalVisits).values({
        workerId: input.workerId,
        visitType: input.visitType,
        requestDate: input.requestDate || null,
        scheduledDate: input.scheduledDate || null,
        requestStatus: "richiesta",
        createdBy: ctx.user.id,
      });
      await logAudit(ctx, "create", "medical_visits", {
        entityId: input.workerId,
        module: "sorveglianza",
        reason: "Creazione richiesta visita",
      });
      return result;
    }),

  update: medicalOperationalQuery
    .input(
      z.object({
        id: z.number(),
        scheduledDate: z.string().optional(),
        visitDate: z.string().optional(),
        nextVisitDue: z.string().optional(),
        requestStatus: requestStatusSchema.optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {
        updatedBy: ctx.user.id,
      };
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updateData[key] = value === "" ? null : value;
        }
      }
      const result = await db
        .update(medicalVisits)
        .set(updateData)
        .where(eq(medicalVisits.id, id));
      await logAudit(ctx, "update", "medical_visits", {
        entityId: id,
        module: "sorveglianza",
        reason: "Aggiornamento dati operativi visita",
      });
      return result;
    }),

  updateClinical: medicoQuery
    .input(
      z.object({
        id: z.number(),
        doctorName: z.string().optional(),
        doctorId: z.string().optional(),
        healthProtocol: z.string().optional(),
        visitDate: z.string().optional(),
        judgment: judgmentSchema.optional(),
        nextVisitDue: z.string().optional(),
        limitationDescription: z.string().optional(),
        prescriptionDescription: z.string().optional(),
        attachmentUrl: z.string().optional(),
        requestStatus: requestStatusSchema.optional(),
        notes: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {
        updatedBy: ctx.user.id,
      };
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updateData[key] = value === "" ? null : value;
        }
      }
      const result = await db
        .update(medicalVisits)
        .set(updateData)
        .where(eq(medicalVisits.id, id));
      await logAudit(ctx, "update", "medical_visits", {
        entityId: id,
        module: "sorveglianza",
        reason: "Aggiornamento dati clinici visita",
      });
      return result;
    }),

  delete: medicoQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .delete(medicalVisits)
        .where(eq(medicalVisits.id, input.id));
      await logAudit(ctx, "delete", "medical_visits", {
        entityId: input.id,
        module: "sorveglianza",
      });
      return { success: true };
    }),
});
