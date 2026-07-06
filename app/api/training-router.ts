import { z } from "zod";
import { createRouter, operatoreQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import { trainingCourses, trainingCertificates, trainingTypes } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

type CourseStatus = typeof trainingCourses.$inferSelect.status;
type CertificateStatus = typeof trainingCertificates.$inferSelect.validityStatus;

export const trainingRouter = createRouter({
  types: operatoreQuery.query(async () => {
    const db = getDb();
    return db.query.trainingTypes.findMany({ where: eq(trainingTypes.active, true), orderBy: [trainingTypes.name] });
  }),

  courses: operatoreQuery.input(z.object({ trainingTypeId: z.number().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.trainingTypeId) conditions.push(eq(trainingCourses.trainingTypeId, input.trainingTypeId));
      if (input?.status) conditions.push(eq(trainingCourses.status, input.status as CourseStatus));
      return db.query.trainingCourses.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { trainingType: true, certificates: { with: { worker: true } } },
        orderBy: [desc(trainingCourses.courseDate)],
      });
    }),

  certificates: operatoreQuery.input(z.object({ workerId: z.number().optional(), validityStatus: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.workerId) conditions.push(eq(trainingCertificates.workerId, input.workerId));
      if (input?.validityStatus) conditions.push(eq(trainingCertificates.validityStatus, input.validityStatus as CertificateStatus));
      return db.query.trainingCertificates.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { worker: true, course: { with: { trainingType: true } } },
        orderBy: [desc(trainingCertificates.issueDate)],
      });
    }),

  createCourse: operatoreQuery.input(z.object({ title: z.string().min(1), trainingTypeId: z.number(), provider: z.string().optional(), normativeReference: z.string().optional(), durationHours: z.number().optional(), modality: z.enum(["presenza", "vcs", "e_learning", "mista"]).default("presenza"), courseDate: z.string().optional(), hasFinalVerification: z.boolean().default(false), status: z.enum(["programmato", "in_corso", "completato", "annullato"]).default("programmato"), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(trainingCourses).values({ ...input, provider: input.provider || null, normativeReference: input.normativeReference || null, durationHours: input.durationHours || null, courseDate: input.courseDate || null, notes: input.notes || null, createdBy: ctx.user.id });
      await logAudit(ctx, "create", "training_courses", { entityName: input.title, module: "formazione" });
      return result;
    }),

  createCertificate: operatoreQuery.input(z.object({ workerId: z.number(), courseId: z.number(), certificateNumber: z.string().optional(), issueDate: z.string().optional(), expiryDate: z.string().optional(), attachmentUrl: z.string().optional(), validityStatus: z.enum(["valido", "in_scadenza", "scaduto", "revocato"]).default("valido"), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(trainingCertificates).values({ ...input, certificateNumber: input.certificateNumber || null, issueDate: input.issueDate || null, expiryDate: input.expiryDate || null, attachmentUrl: input.attachmentUrl || null, notes: input.notes || null, createdBy: ctx.user.id });
      await logAudit(ctx, "create", "training_certificates", { entityId: input.workerId, module: "formazione" });
      return result;
    }),
});
