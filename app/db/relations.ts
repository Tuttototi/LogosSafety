import { relations } from "drizzle-orm";
import {
  companies,
  sites,
  contracts,
  jobRoles,
  risks,
  jobRoleRisks,
  trainingTypes,
  jobRoleTraining,
  workers,
  trainingCourses,
  trainingCertificates,
  medicalVisits,
  documents,
  alerts,
  microclimateSites,
  microclimateReadings,
  microclimateAlerts,
  notificationLogs,
  ot23Compliance,
  users,
  userOrganizationScopes,
} from "./schema";

export const companiesRelations = relations(companies, ({ many }) => ({
  sites: many(sites),
  workers: many(workers),
  microclimateSites: many(microclimateSites),
  ot23Compliance: many(ot23Compliance),
  organizationScopes: many(userOrganizationScopes),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  company: one(companies, { fields: [sites.companyId], references: [companies.id] }),
  workers: many(workers),
  microclimateSites: many(microclimateSites),
  ot23Compliance: many(ot23Compliance),
  organizationScopes: many(userOrganizationScopes),
}));

export const contractsRelations = relations(contracts, ({ many }) => ({
  organizationScopes: many(userOrganizationScopes),
}));

export const usersRelations = relations(users, ({ many }) => ({
  organizationScopes: many(userOrganizationScopes),
  notificationLogs: many(notificationLogs),
}));

export const userOrganizationScopesRelations = relations(
  userOrganizationScopes,
  ({ one }) => ({
    user: one(users, {
      fields: [userOrganizationScopes.userId],
      references: [users.id],
    }),
    company: one(companies, {
      fields: [userOrganizationScopes.companyId],
      references: [companies.id],
    }),
    site: one(sites, {
      fields: [userOrganizationScopes.siteId],
      references: [sites.id],
    }),
    contract: one(contracts, {
      fields: [userOrganizationScopes.contractId],
      references: [contracts.id],
    }),
  })
);

export const jobRolesRelations = relations(jobRoles, ({ many }) => ({
  workers: many(workers),
  jobRoleRisks: many(jobRoleRisks),
  jobRoleTraining: many(jobRoleTraining),
}));

export const risksRelations = relations(risks, ({ many }) => ({
  jobRoleRisks: many(jobRoleRisks),
}));

export const jobRoleRisksRelations = relations(jobRoleRisks, ({ one }) => ({
  jobRole: one(jobRoles, { fields: [jobRoleRisks.jobRoleId], references: [jobRoles.id] }),
  risk: one(risks, { fields: [jobRoleRisks.riskId], references: [risks.id] }),
}));

export const trainingTypesRelations = relations(trainingTypes, ({ many }) => ({
  jobRoleTraining: many(jobRoleTraining),
  trainingCourses: many(trainingCourses),
}));

export const jobRoleTrainingRelations = relations(jobRoleTraining, ({ one }) => ({
  jobRole: one(jobRoles, { fields: [jobRoleTraining.jobRoleId], references: [jobRoles.id] }),
  trainingType: one(trainingTypes, { fields: [jobRoleTraining.trainingTypeId], references: [trainingTypes.id] }),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  company: one(companies, { fields: [workers.companyId], references: [companies.id] }),
  site: one(sites, { fields: [workers.siteId], references: [sites.id] }),
  jobRole: one(jobRoles, { fields: [workers.jobRoleId], references: [jobRoles.id] }),
  trainingCertificates: many(trainingCertificates),
  medicalVisits: many(medicalVisits),
  documents: many(documents),
  alerts: many(alerts),
}));

export const microclimateSitesRelations = relations(microclimateSites, ({ one, many }) => ({
  company: one(companies, { fields: [microclimateSites.companyId], references: [companies.id] }),
  site: one(sites, { fields: [microclimateSites.siteId], references: [sites.id] }),
  readings: many(microclimateReadings),
  alerts: many(microclimateAlerts),
}));

export const microclimateReadingsRelations = relations(microclimateReadings, ({ one, many }) => ({
  site: one(microclimateSites, { fields: [microclimateReadings.microclimateSiteId], references: [microclimateSites.id] }),
  alerts: many(microclimateAlerts),
}));

export const microclimateAlertsRelations = relations(microclimateAlerts, ({ one, many }) => ({
  site: one(microclimateSites, { fields: [microclimateAlerts.microclimateSiteId], references: [microclimateSites.id] }),
  reading: one(microclimateReadings, { fields: [microclimateAlerts.microclimateReadingId], references: [microclimateReadings.id] }),
  notificationLogs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  user: one(users, { fields: [notificationLogs.userId], references: [users.id] }),
  microclimateAlert: one(microclimateAlerts, { fields: [notificationLogs.microclimateAlertId], references: [microclimateAlerts.id] }),
}));

export const ot23ComplianceRelations = relations(ot23Compliance, ({ one }) => ({
  company: one(companies, { fields: [ot23Compliance.companyId], references: [companies.id] }),
  site: one(sites, { fields: [ot23Compliance.siteId], references: [sites.id] }),
  document: one(documents, { fields: [ot23Compliance.documentId], references: [documents.id] }),
}));

export const trainingCoursesRelations = relations(trainingCourses, ({ one, many }) => ({
  trainingType: one(trainingTypes, { fields: [trainingCourses.trainingTypeId], references: [trainingTypes.id] }),
  certificates: many(trainingCertificates),
}));

export const trainingCertificatesRelations = relations(trainingCertificates, ({ one }) => ({
  worker: one(workers, { fields: [trainingCertificates.workerId], references: [workers.id] }),
  course: one(trainingCourses, { fields: [trainingCertificates.courseId], references: [trainingCourses.id] }),
}));

export const medicalVisitsRelations = relations(medicalVisits, ({ one }) => ({
  worker: one(workers, { fields: [medicalVisits.workerId], references: [workers.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  worker: one(workers, { fields: [documents.workerId], references: [workers.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  worker: one(workers, { fields: [alerts.workerId], references: [workers.id] }),
}));
