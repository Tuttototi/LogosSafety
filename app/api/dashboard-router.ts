import { createRouter, respSicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { workers, trainingCertificates, alerts, jobRoles, companies } from "@db/schema";
import { eq, and, count } from "drizzle-orm";

export const dashboardRouter = createRouter({
  stats: respSicQuery.query(async () => {
    const db = getDb();
    const totalWorkers = await db.select({ count: count() }).from(workers).where(eq(workers.active, true));
    const activeWorkers = await db.select({ count: count() }).from(workers).where(and(eq(workers.active, true), eq(workers.status, "attivo")));
    const expiredCerts = await db.select({ count: count() }).from(trainingCertificates).where(eq(trainingCertificates.validityStatus, "scaduto"));
    const expiringCerts = await db.select({ count: count() }).from(trainingCertificates).where(eq(trainingCertificates.validityStatus, "in_scadenza"));
    const openAlerts = await db.select({ count: count() }).from(alerts).where(eq(alerts.resolved, false));
    const criticalAlerts = await db.select({ count: count() }).from(alerts).where(and(eq(alerts.resolved, false), eq(alerts.severity, "critica")));
    const totalCompanies = await db.select({ count: count() }).from(companies).where(eq(companies.active, true));
    const totalJobRoles = await db.select({ count: count() }).from(jobRoles).where(eq(jobRoles.active, true));

    return {
      totalWorkers: totalWorkers[0]?.count ?? 0,
      activeWorkers: activeWorkers[0]?.count ?? 0,
      expiredCertificates: expiredCerts[0]?.count ?? 0,
      expiringCertificates: expiringCerts[0]?.count ?? 0,
      openAlerts: openAlerts[0]?.count ?? 0,
      criticalAlerts: criticalAlerts[0]?.count ?? 0,
      totalCompanies: totalCompanies[0]?.count ?? 0,
      totalJobRoles: totalJobRoles[0]?.count ?? 0,
    };
  }),

  complianceMatrix: respSicQuery.query(async () => {
    const db = getDb();
    const allWorkers = await db.query.workers.findMany({
      where: eq(workers.active, true),
      with: {
        company: true,
        site: true,
        jobRole: true,
        trainingCertificates: {
          with: {
            course: { with: { trainingType: true } },
          },
        },
        medicalVisits: true,
      },
    });

    return allWorkers.map((w) => {
      const certs = w.trainingCertificates || [];
      const visits = w.medicalVisits || [];
      const generale = certs.find((c) => c.course?.trainingType?.code === "FORM_GEN");
      const specifica = certs.find((c) => c.course?.trainingType?.code === "FORM_SPEC_M" || c.course?.trainingType?.code === "FORM_SPEC_A" || c.course?.trainingType?.code === "FORM_SPEC_B");
      const antincendio = certs.find((c) => c.course?.trainingType?.code === "ANTINCENDIO");
      const primoSoccorso = certs.find((c) => c.course?.trainingType?.code === "PRIMO_SOCCORSO");
      const ple = certs.find((c) => c.course?.trainingType?.code === "PLE");
      const carrelli = certs.find((c) => c.course?.trainingType?.code === "CARRELLI");
      const latestVisit = visits.filter((v) => v.visitDate && v.judgment).sort((a, b) => new Date(b.visitDate!).getTime() - new Date(a.visitDate!).getTime())[0];

      const getStatus = (cert: typeof generale) => {
        if (!cert) return "mancante";
        if (cert.validityStatus === "scaduto") return "scaduto";
        if (cert.validityStatus === "in_scadenza") return "in_scadenza";
        if (cert.validityStatus === "valido") return "valido";
        return "mancante";
      };

      const getVisitStatus = () => {
        if (!w.requiresMedicalVisit) return "non_richiesto";
        if (!latestVisit) return "mancante";
        if (!latestVisit.nextVisitDue) return "valido";
        const now = new Date();
        const nextDue = new Date(latestVisit.nextVisitDue);
        const daysDiff = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) return "scaduto";
        if (daysDiff <= 60) return "in_scadenza";
        return "valido";
      };

      const statuses = [getStatus(generale), getStatus(specifica), getStatus(antincendio), getStatus(primoSoccorso), getStatus(ple), getStatus(carrelli), getVisitStatus()];
      let overallStatus = "compliant";
      if (statuses.some((s) => s === "scaduto" || s === "mancante")) overallStatus = "non_conforme";
      else if (statuses.some((s) => s === "in_scadenza")) overallStatus = "scadenza_vicina";

      return {
        worker: { id: w.id, firstName: w.firstName, lastName: w.lastName, fiscalCode: w.fiscalCode, status: w.status },
        company: w.company?.name ?? "—",
        site: w.site?.name ?? "—",
        jobRole: w.jobRole?.name ?? "—",
        riskLevel: w.jobRole?.riskLevel ?? "basso",
        training: { generale: getStatus(generale), specifica: getStatus(specifica), antincendio: getStatus(antincendio), primoSoccorso: getStatus(primoSoccorso), ple: getStatus(ple), carrelli: getStatus(carrelli) },
        medicalVisit: getVisitStatus(),
        overallStatus,
      };
    });
  }),

  upcomingDeadlines: respSicQuery.query(async () => {
    const db = getDb();
    const upcomingCerts = await db.query.trainingCertificates.findMany({
      where: and(eq(trainingCertificates.validityStatus, "in_scadenza")),
      with: { worker: true, course: { with: { trainingType: true } } },
      limit: 20,
    });
    const openAlertsList = await db.query.alerts.findMany({
      where: eq(alerts.resolved, false),
      with: { worker: true },
      orderBy: (alerts, { desc }) => [desc(alerts.severity)],
      limit: 20,
    });

    return {
      certificateDeadlines: upcomingCerts.map((c) => ({
        id: c.id, workerName: `${c.worker?.firstName} ${c.worker?.lastName}`,
        courseName: c.course?.trainingType?.name ?? "—", expiryDate: c.expiryDate,
        daysRemaining: c.expiryDate ? Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      })),
      alerts: openAlertsList.map((a) => ({
        id: a.id, workerName: a.worker ? `${a.worker.firstName} ${a.worker.lastName}` : "—",
        severity: a.severity, description: a.description, dueDate: a.dueDate,
      })),
    };
  }),
});
