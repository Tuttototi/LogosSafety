import { z } from "zod";
import {
  createRouter,
  logAudit,
  medicalOperationalQuery,
  operatoreQuery,
} from "./middleware";
import { getDb } from "./queries/connection";
import { workers, trainingCertificates, medicalVisits, alerts } from "@db/schema";
import { eq, and } from "drizzle-orm";

type AlertSeverity = typeof alerts.$inferSelect.severity;

export const complianceRouter = createRouter({
  checkWorker: operatoreQuery.input(z.object({ workerId: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const worker = await db.query.workers.findFirst({
      where: eq(workers.id, input.workerId),
      with: {
        jobRole: { with: { jobRoleTraining: { with: { trainingType: true } } } },
        trainingCertificates: { with: { course: { with: { trainingType: true } } } },
        medicalVisits: { orderBy: (medicalVisits, { desc }) => [desc(medicalVisits.visitDate)] },
      },
    });
    if (!worker) return null;

    const requiredTraining = worker.jobRole?.jobRoleTraining || [];
    const certificates = worker.trainingCertificates || [];
    const visits = worker.medicalVisits || [];

    const trainingChecks = requiredTraining.map((rt) => {
      const cert = certificates.find((c) => c.course?.trainingTypeId === rt.trainingTypeId);
      let status: "ok" | "manca" | "scaduta" | "in_scadenza" = "manca";
      if (cert) {
        if (cert.validityStatus === "valido") status = "ok";
        else if (cert.validityStatus === "in_scadenza") status = "in_scadenza";
        else if (cert.validityStatus === "scaduto") status = "scaduta";
      }
      return { trainingType: rt.trainingType?.name ?? "—", trainingCode: rt.trainingType?.code ?? "—", status, expiryDate: cert?.expiryDate ?? null, certificateId: cert?.id ?? null };
    });

    let visitStatus: "ok" | "scaduta" | "non_necessaria" | "da_valutare" | "mancante" = "non_necessaria";
    if (worker.requiresMedicalVisit) {
      const latestVisit = visits.find((v) => v.visitDate && v.judgment);
      if (!latestVisit) { visitStatus = "mancante"; }
      else if (!latestVisit.nextVisitDue) { visitStatus = "ok"; }
      else {
        const now = new Date(); const nextDue = new Date(latestVisit.nextVisitDue);
        if (nextDue < now) visitStatus = "scaduta";
        else { const dd = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); visitStatus = dd <= 60 ? "da_valutare" : "ok"; }
      }
    }

    const hasLimitations = visits.some((v) => v.judgment === "idoneo_limitazioni" || v.judgment === "idoneo_prescrizioni");
    const nonIdoneo = visits.some((v) => v.judgment === "non_idoneo" || v.judgment === "temp_non_idoneo");

    let finalOutcome: "idoneo" | "non_assegnabile" | "da_verificare" = "idoneo";
    if (nonIdoneo) finalOutcome = "non_assegnabile";
    else if (trainingChecks.some((t) => t.status === "manca" || t.status === "scaduta")) finalOutcome = "non_assegnabile";
    else if (visitStatus === "scaduta" || visitStatus === "mancante") finalOutcome = "non_assegnabile";
    else if (trainingChecks.some((t) => t.status === "in_scadenza") || visitStatus === "da_valutare" || hasLimitations) finalOutcome = "da_verificare";

    return {
      worker: {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName}`,
        jobRole: worker.jobRole?.name ?? "—",
        status: worker.status,
      },
      training: trainingChecks,
      medicalVisit: {
        status: visitStatus,
        requiresVisit: worker.requiresMedicalVisit,
        latestVisit: visits[0]
          ? {
              date: visits[0].visitDate,
              nextDue: visits[0].nextVisitDue,
              requestStatus: visits[0].requestStatus,
            }
          : null,
      },
      finalOutcome,
    };
  }),

  alerts: operatoreQuery.input(z.object({ resolved: z.boolean().optional(), severity: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.resolved !== undefined) conditions.push(eq(alerts.resolved, input.resolved));
      if (input?.severity) conditions.push(eq(alerts.severity, input.severity as AlertSeverity));
      return db.query.alerts.findMany({ where: conditions.length > 0 ? and(...conditions) : undefined, with: { worker: true }, orderBy: (alerts, { desc }) => [desc(alerts.createdAt)] });
    }),

  resolveAlert: operatoreQuery.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    await db.update(alerts).set({ resolved: true, resolvedAt: new Date(), resolvedBy: ctx.user.id }).where(eq(alerts.id, input.id));
    await logAudit(ctx, "update", "alerts", { entityId: input.id, module: "compliance", newValue: "resolved" });
    return { success: true };
  }),

  scadenziario: medicalOperationalQuery.input(z.object({ days: z.number().default(90) }).optional()).query(async ({ input }) => {
    const db = getDb();
    const expiringCerts = await db.query.trainingCertificates.findMany({
      where: and(eq(trainingCertificates.validityStatus, "in_scadenza")),
      with: { worker: true, course: { with: { trainingType: true } } },
    });
    const expiredCerts = await db.query.trainingCertificates.findMany({
      where: eq(trainingCertificates.validityStatus, "scaduto"),
      with: { worker: true, course: { with: { trainingType: true } } },
    });
    const upcomingVisits = await db.query.medicalVisits.findMany({
      where: and(eq(medicalVisits.requestStatus, "completata")),
      with: { worker: true },
    });
    const filteredVisits = upcomingVisits.filter((v) => {
      if (!v.nextVisitDue) return false;
      const now = new Date(); const nextDue = new Date(v.nextVisitDue);
      return Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= (input?.days ?? 90);
    });
    return {
      expiringCertificates: expiringCerts.map((c) => ({ id: c.id, type: "formazione_scadenza" as const, workerName: `${c.worker?.firstName} ${c.worker?.lastName}`, description: `${c.course?.trainingType?.name ?? "Formazione"} in scadenza`, dueDate: c.expiryDate, severity: "media" as const })),
      expiredCertificates: expiredCerts.map((c) => ({ id: c.id, type: "formazione_mancante" as const, workerName: `${c.worker?.firstName} ${c.worker?.lastName}`, description: `${c.course?.trainingType?.name ?? "Formazione"} scaduta`, dueDate: c.expiryDate, severity: "alta" as const })),
      upcomingVisits: filteredVisits.map((v) => ({ id: v.id, type: "visita_scadenza" as const, workerName: `${v.worker?.firstName} ${v.worker?.lastName}`, description: `Visita ${v.visitType.replace(/_/g, " ")} in scadenza`, dueDate: v.nextVisitDue, severity: v.nextVisitDue && new Date(v.nextVisitDue) < new Date() ? "critica" as const : "media" as const })),
    };
  }),
});
