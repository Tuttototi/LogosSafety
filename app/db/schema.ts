import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  date,
  bigint,
  json,
  index,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/mysql-core";

// Drizzle MySQL does not support .references() on serial/bigint FKs in this version.
// FK constraints are enforced at application level via queries and relations.
// For production, add FK constraints via manual migration SQL.

// ─── Users (OAuth) ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", [
    "admin",
    "responsabile_sicurezza",
    "operatore_sicurezza",
    "medico_competente",
    "referente_commessa",
    "sola_lettura",
    "auditor",
  ]).default("sola_lettura").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
});

export type User = typeof users.$inferSelect;

// ─── Companies (Aziende) ────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  vatNumber: varchar("vat_number", { length: 50 }),
  fiscalCode: varchar("fiscal_code", { length: 16 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 10 }),
  zipCode: varchar("zip_code", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  pec: varchar("pec", { length: 320 }),
  isCooperative: boolean("is_cooperative").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_companies_name").on(table.name),
  index("idx_companies_active").on(table.active),
]);

export type Company = typeof companies.$inferSelect;

// ─── Sites (Sedi Operative) ─────────────────────────────────────
export const sites = mysqlTable("sites", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 10 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_sites_company").on(table.companyId),
  index("idx_sites_active").on(table.active),
]);

// ─── Contracts / Commesse ───────────────────────────────────────
export const contracts = mysqlTable("contracts", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientCompanyId: bigint("client_company_id", { mode: "number", unsigned: true }),
  siteId: bigint("site_id", { mode: "number", unsigned: true }),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  status: mysqlEnum("status", ["attivo", "completato", "sospeso", "annullato"]).default("attivo").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  uniqueIndex("idx_contracts_code").on(table.code),
  index("idx_contracts_status").on(table.status),
]);

export type Contract = typeof contracts.$inferSelect;

// Organizational scopes assigned to non-global users.
// A company-only row grants the full company; siteId narrows the scope to a
// site; contractId narrows it to a single contract/commessa.
export const userOrganizationScopes = mysqlTable("user_organization_scopes", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  siteId: bigint("site_id", { mode: "number", unsigned: true }),
  contractId: bigint("contract_id", { mode: "number", unsigned: true }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_user_org_scopes_user").on(table.userId),
  index("idx_user_org_scopes_company").on(table.companyId),
  index("idx_user_org_scopes_site").on(table.siteId),
  index("idx_user_org_scopes_contract").on(table.contractId),
  index("idx_user_org_scopes_active").on(table.userId, table.active),
  foreignKey({
    name: "fk_user_org_scopes_user_id",
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  foreignKey({
    name: "fk_user_org_scopes_company_id",
    columns: [table.companyId],
    foreignColumns: [companies.id],
  }),
  foreignKey({
    name: "fk_user_org_scopes_site_id",
    columns: [table.siteId],
    foreignColumns: [sites.id],
  }),
  foreignKey({
    name: "fk_user_org_scopes_contract_id",
    columns: [table.contractId],
    foreignColumns: [contracts.id],
  }),
]);

export type UserOrganizationScope = typeof userOrganizationScopes.$inferSelect;

// ─── Departments (Reparti) ──────────────────────────────────────
export const departments = mysqlTable("departments", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  siteId: bigint("site_id", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
});

// ─── Job Roles (Mansioni) ───────────────────────────────────────
export const jobRoles = mysqlTable("job_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  description: text("description"),
  riskLevel: mysqlEnum("risk_level", ["basso", "medio", "alto"]).default("basso").notNull(),
  requiresMedicalVisit: boolean("requires_medical_visit").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  uniqueIndex("idx_jobroles_name").on(table.name),
  index("idx_jobroles_risk").on(table.riskLevel),
]);

export type JobRole = typeof jobRoles.$inferSelect;

// ─── Risks ──────────────────────────────────────────────────────
export const risks = mysqlTable("risks", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_risks_code").on(table.code),
  index("idx_risks_category").on(table.category),
]);

export type Risk = typeof risks.$inferSelect;

// ─── Job Role - Risks mapping ───────────────────────────────────
export const jobRoleRisks = mysqlTable("job_role_risks", {
  id: serial("id").primaryKey(),
  jobRoleId: bigint("job_role_id", { mode: "number", unsigned: true }).notNull(),
  riskId: bigint("risk_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_jrr_unique").on(table.jobRoleId, table.riskId),
]);

// ─── Training Types ─────────────────────────────────────────────
export const trainingTypes = mysqlTable("training_types", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  normativeReference: varchar("normative_reference", { length: 255 }),
  defaultValidityMonths: int("default_validity_months"),
  category: varchar("category", { length: 100 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  uniqueIndex("idx_trainingtypes_code").on(table.code),
  index("idx_trainingtypes_category").on(table.category),
]);

export type TrainingType = typeof trainingTypes.$inferSelect;

// ─── Job Role - Training mapping ────────────────────────────────
export const jobRoleTraining = mysqlTable("job_role_training", {
  id: serial("id").primaryKey(),
  jobRoleId: bigint("job_role_id", { mode: "number", unsigned: true }).notNull(),
  trainingTypeId: bigint("training_type_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_jrt_unique").on(table.jobRoleId, table.trainingTypeId),
]);

// ─── Workers (Dipendenti) ───────────────────────────────────────
export const workers = mysqlTable("workers", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  fiscalCode: varchar("fiscal_code", { length: 16 }),
  birthDate: date("birth_date", { mode: "string" }),
  birthPlace: varchar("birth_place", { length: 100 }),
  gender: mysqlEnum("gender", ["M", "F", "altro"]),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  siteId: bigint("site_id", { mode: "number", unsigned: true }),
  contractId: bigint("contract_id", { mode: "number", unsigned: true }),
  departmentId: bigint("department_id", { mode: "number", unsigned: true }),
  jobRoleId: bigint("job_role_id", { mode: "number", unsigned: true }).notNull(),
  hireDate: date("hire_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  status: mysqlEnum("status", ["attivo", "cessato", "sospeso"]).default("attivo").notNull(),
  requiresMedicalVisit: boolean("requires_medical_visit").default(false).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  emergencyContact: varchar("emergency_contact", { length: 255 }),
  emergencyPhone: varchar("emergency_phone", { length: 50 }),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: bigint("deleted_by", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_workers_company").on(table.companyId),
  index("idx_workers_site").on(table.siteId),
  index("idx_workers_role").on(table.jobRoleId),
  index("idx_workers_status").on(table.status),
  index("idx_workers_contract").on(table.contractId),
  index("idx_workers_fiscal").on(table.fiscalCode),
  index("idx_workers_active").on(table.active),
]);

export type Worker = typeof workers.$inferSelect;

// ─── Worker Job History ─────────────────────────────────────────
export const workerJobHistory = mysqlTable("worker_job_history", {
  id: serial("id").primaryKey(),
  workerId: bigint("worker_id", { mode: "number", unsigned: true }).notNull(),
  oldJobRoleId: bigint("old_job_role_id", { mode: "number", unsigned: true }),
  newJobRoleId: bigint("new_job_role_id", { mode: "number", unsigned: true }).notNull(),
  oldCompanyId: bigint("old_company_id", { mode: "number", unsigned: true }),
  newCompanyId: bigint("new_company_id", { mode: "number", unsigned: true }),
  changeDate: date("change_date", { mode: "string" }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
});

// ─── Training Courses ───────────────────────────────────────────
export const trainingCourses = mysqlTable("training_courses", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  trainingTypeId: bigint("training_type_id", { mode: "number", unsigned: true }).notNull(),
  provider: varchar("provider", { length: 255 }),
  normativeReference: varchar("normative_reference", { length: 255 }),
  durationHours: int("duration_hours"),
  modality: mysqlEnum("modality", ["presenza", "vcs", "e_learning", "mista"]).default("presenza").notNull(),
  courseDate: date("course_date", { mode: "string" }),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["programmato", "in_corso", "completato", "annullato"]).default("programmato").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
});

export type TrainingCourse = typeof trainingCourses.$inferSelect;

// ─── Training Certificates ──────────────────────────────────────
export const trainingCertificates = mysqlTable("training_certificates", {
  id: serial("id").primaryKey(),
  workerId: bigint("worker_id", { mode: "number", unsigned: true }).notNull(),
  courseId: bigint("course_id", { mode: "number", unsigned: true }).notNull(),
  certificateNumber: varchar("certificate_number", { length: 255 }),
  issueDate: date("issue_date", { mode: "string" }),
  expiryDate: date("expiry_date", { mode: "string" }),
  attachmentUrl: text("attachment_url"),
  validityStatus: mysqlEnum("validity_status", ["valido", "in_scadenza", "scaduto", "revocato"]).default("valido").notNull(),
  hoursAttended: int("hours_attended"),
  finalScore: varchar("final_score", { length: 20 }),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_cert_worker").on(table.workerId),
  index("idx_cert_status").on(table.validityStatus),
  index("idx_cert_expiry").on(table.expiryDate),
]);

export type TrainingCertificate = typeof trainingCertificates.$inferSelect;

// ─── Medical Visits ─────────────────────────────────────────────
export const medicalVisits = mysqlTable("medical_visits", {
  id: serial("id").primaryKey(),
  workerId: bigint("worker_id", { mode: "number", unsigned: true }).notNull(),
  visitType: mysqlEnum("visit_type", [
    "preventiva",
    "preassuntiva",
    "periodica",
    "cambio_mansione",
    "richiesta_lavoratore",
    "rientro_malattia",
    "rientro_infortunio",
    "cessazione",
    "straordinaria",
  ]).notNull(),
  doctorName: varchar("doctor_name", { length: 255 }),
  doctorId: varchar("doctor_id", { length: 100 }),
  healthProtocol: varchar("health_protocol", { length: 255 }),
  requestDate: date("request_date", { mode: "string" }),
  scheduledDate: date("scheduled_date", { mode: "string" }),
  visitDate: date("visit_date", { mode: "string" }),
  judgment: mysqlEnum("judgment", [
    "idoneo",
    "idoneo_prescrizioni",
    "idoneo_limitazioni",
    "temp_non_idoneo",
    "non_idoneo",
  ]),
  nextVisitDue: date("next_visit_due", { mode: "string" }),
  limitationDescription: text("limitation_description"),
  prescriptionDescription: text("prescription_description"),
  attachmentUrl: text("attachment_url"),
  requestStatus: mysqlEnum("request_status", ["richiesta", "prenotata", "completata", "annullata"]).default("richiesta").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_visit_worker").on(table.workerId),
  index("idx_visit_type").on(table.visitType),
  index("idx_visit_judgment").on(table.judgment),
  index("idx_visit_nextdue").on(table.nextVisitDue),
  index("idx_visit_status").on(table.requestStatus),
]);

export type MedicalVisit = typeof medicalVisits.$inferSelect;

// ─── Documents ──────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: serial("id").primaryKey(),
  workerId: bigint("worker_id", { mode: "number", unsigned: true }),
  entityType: mysqlEnum("entity_type", [
    "dipendente",
    "corso",
    "attestato",
    "visita_medica",
    "mansione",
    "commessa",
    "azienda",
    "generale",
  ]).notNull(),
  entityId: bigint("entity_id", { mode: "number", unsigned: true }),
  documentType: mysqlEnum("document_type", [
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
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: bigint("file_size", { mode: "number", unsigned: true }),
  mimeType: varchar("mime_type", { length: 100 }),
  version: int("version").default(1).notNull(),
  expiryDate: date("expiry_date", { mode: "string" }),
  status: mysqlEnum("status", ["valido", "in_scadenza", "scaduto", "revocato"]).default("valido").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_doc_worker").on(table.workerId),
  index("idx_doc_entity").on(table.entityType, table.entityId),
  index("idx_doc_type").on(table.documentType),
  index("idx_doc_status").on(table.status),
]);

export type Document = typeof documents.$inferSelect;

// ─── Alerts ─────────────────────────────────────────────────────
export const alerts = mysqlTable("alerts", {
  id: serial("id").primaryKey(),
  workerId: bigint("worker_id", { mode: "number", unsigned: true }).notNull(),
  alertType: mysqlEnum("alert_type", [
    "formazione_scadenza",
    "formazione_mancante",
    "visita_scadenza",
    "visita_mancante",
    "documento_scadenza",
    "aggiornamento",
    "rientro_verifica",
    "non_conforme",
    "mansione_cambiata",
  ]).notNull(),
  itemId: bigint("item_id", { mode: "number", unsigned: true }),
  itemType: varchar("item_type", { length: 50 }),
  description: text("description").notNull(),
  severity: mysqlEnum("severity", ["bassa", "media", "alta", "critica"]).default("media").notNull(),
  dueDate: date("due_date", { mode: "string" }),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: bigint("resolved_by", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_alert_worker").on(table.workerId),
  index("idx_alert_resolved").on(table.resolved),
  index("idx_alert_severity").on(table.severity),
  index("idx_alert_type").on(table.alertType),
]);

export type Alert = typeof alerts.$inferSelect;

// ─── Microclimate Sites ────────────────────────────────────────
export const microclimateSites = mysqlTable("microclimate_sites", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  siteId: bigint("site_id", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }),
  description: text("description"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
  updatedBy: bigint("updated_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_microclima_sites_company").on(table.companyId),
  index("idx_microclima_sites_site").on(table.siteId),
  index("idx_microclima_sites_active").on(table.active),
  uniqueIndex("idx_microclima_sites_code").on(table.code),
  foreignKey({
    name: "fk_microclimate_sites_company_id",
    columns: [table.companyId],
    foreignColumns: [companies.id],
  }),
  foreignKey({
    name: "fk_microclimate_sites_site_id",
    columns: [table.siteId],
    foreignColumns: [sites.id],
  }),
]);

export type MicroclimateSite = typeof microclimateSites.$inferSelect;

// ─── Microclimate Readings ───────────────────────────────────
export const microclimateReadings = mysqlTable("microclimate_readings", {
  id: serial("id").primaryKey(),
  microclimateSiteId: bigint("microclimate_site_id", { mode: "number", unsigned: true }).notNull(),
  temperature: int("temperature"),
  humidity: int("humidity"),
  windSpeed: int("wind_speed"),
  pressure: int("pressure"),
  co2: int("co2"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_microclima_readings_site").on(table.microclimateSiteId),
  index("idx_microclima_readings_recorded").on(table.recordedAt),
  foreignKey({
    name: "fk_microclimate_readings_microclimate_site_id",
    columns: [table.microclimateSiteId],
    foreignColumns: [microclimateSites.id],
  }),
]);

export type MicroclimateReading = typeof microclimateReadings.$inferSelect;

// ─── Microclimate Alerts ──────────────────────────────────────
export const microclimateAlerts = mysqlTable("microclimate_alerts", {
  id: serial("id").primaryKey(),
  microclimateSiteId: bigint("microclimate_site_id", { mode: "number", unsigned: true }).notNull(),
  microclimateReadingId: bigint("microclimate_reading_id", { mode: "number", unsigned: true }),
  alertType: mysqlEnum("alert_type", [
    "temperature_high",
    "temperature_low",
    "humidity_high",
    "humidity_low",
    "co2_high",
    "wind_speed_high",
    "pressure_low",
    "pressure_high",
    "sensor_fault",
    "custom",
  ]).notNull(),
  severity: mysqlEnum("severity", ["bassa", "media", "alta", "critica"]).default("media").notNull(),
  description: text("description").notNull(),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: bigint("acknowledged_by", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_microclima_alerts_site").on(table.microclimateSiteId),
  index("idx_microclima_alerts_reading").on(table.microclimateReadingId),
  index("idx_microclima_alerts_severity").on(table.severity),
  index("idx_microclima_alerts_ack").on(table.acknowledged),
  foreignKey({
    name: "fk_microclimate_alerts_microclimate_site_id",
    columns: [table.microclimateSiteId],
    foreignColumns: [microclimateSites.id],
  }),
  foreignKey({
    name: "fk_microclimate_alerts_microclimate_reading_id",
    columns: [table.microclimateReadingId],
    foreignColumns: [microclimateReadings.id],
  }),
]);

export type MicroclimateAlert = typeof microclimateAlerts.$inferSelect;

// ─── Notification Logs ───────────────────────────────────────
export const notificationLogs = mysqlTable("notification_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  microclimateAlertId: bigint("microclimate_alert_id", { mode: "number", unsigned: true }),
  channel: mysqlEnum("channel", ["email", "sms", "internal", "webhook"]).default("internal").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "skipped"]).default("pending").notNull(),
  payload: text("payload"),
  response: text("response"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_notification_logs_user").on(table.userId),
  index("idx_notification_logs_alert").on(table.microclimateAlertId),
  index("idx_notification_logs_status").on(table.status),
  foreignKey({
    name: "fk_notification_logs_user_id",
    columns: [table.userId],
    foreignColumns: [users.id],
  }),
  foreignKey({
    name: "fk_notification_logs_microclimate_alert_id",
    columns: [table.microclimateAlertId],
    foreignColumns: [microclimateAlerts.id],
  }),
]);

export type NotificationLog = typeof notificationLogs.$inferSelect;

// ─── OT23 Compliance ─────────────────────────────────────────
export const ot23Compliance = mysqlTable("ot23_compliance", {
  id: serial("id").primaryKey(),
  companyId: bigint("company_id", { mode: "number", unsigned: true }).notNull(),
  siteId: bigint("site_id", { mode: "number", unsigned: true }),
  documentId: bigint("document_id", { mode: "number", unsigned: true }),
  year: int("year").notNull(),
  status: mysqlEnum("status", ["compliant", "non_compliant", "review_required"]).default("review_required").notNull(),
  assessedAt: date("assessed_at", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
}, (table) => [
  index("idx_ot23_company").on(table.companyId),
  index("idx_ot23_site").on(table.siteId),
  uniqueIndex("idx_ot23_company_year").on(table.companyId, table.year),
  foreignKey({
    name: "fk_ot23_compliance_company_id",
    columns: [table.companyId],
    foreignColumns: [companies.id],
  }),
  foreignKey({
    name: "fk_ot23_compliance_site_id",
    columns: [table.siteId],
    foreignColumns: [sites.id],
  }),
  foreignKey({
    name: "fk_ot23_compliance_document_id",
    columns: [table.documentId],
    foreignColumns: [documents.id],
  }),
]);

export type OT23Compliance = typeof ot23Compliance.$inferSelect;

// ─── Non Conformities ───────────────────────────────────────────
export const nonConformities = mysqlTable("non_conformities", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }),
  workerId: bigint("worker_id", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "formazione_mancante",
    "formazione_scaduta",
    "visita_mancante",
    "visita_scaduta",
    "dpi_mancante",
    "documento_mancante",
    "attrezzatura_non_abilitata",
    "altro",
  ]).notNull(),
  severity: mysqlEnum("severity", ["bassa", "media", "alta", "critica"]).default("media").notNull(),
  status: mysqlEnum("status", ["aperta", "in_gestione", "chiusa", "verificata"]).default("aperta").notNull(),
  detectedDate: date("detected_date", { mode: "string" }),
  closedDate: date("closed_date", { mode: "string" }),
  correctiveAction: text("corrective_action"),
  verifiedBy: bigint("verified_by", { mode: "number", unsigned: true }),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }),
});

// ─── Segnalazioni ───────────────────────────────────────────────
export const segnalazioni = mysqlTable("segnalazioni", {
  id: varchar("id", { length: 64 }).primaryKey(),
  code: varchar("code", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }).notNull(),
  contractId: varchar("contract_id", { length: 64 }),
  siteId: varchar("site_id", { length: 64 }),
  plantId: varchar("plant_id", { length: 64 }),
  areaId: varchar("area_id", { length: 64 }),
  reporterUserId: varchar("reporter_user_id", { length: 64 }).notNull(),
  reporterPersonId: varchar("reporter_person_id", { length: 64 }).notNull(),
  reporterEmployeeId: varchar("reporter_employee_id", { length: 64 }),
  reporterFirstName: varchar("reporter_first_name", { length: 120 }).notNull(),
  reporterLastName: varchar("reporter_last_name", { length: 120 }).notNull(),
  reporterEmail: varchar("reporter_email", { length: 320 }),
  reporterCompanyId: varchar("reporter_company_id", { length: 64 }).notNull(),
  reporterRole: varchar("reporter_role", { length: 64 }).notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 64 }).notNull(),
  createdByPersonId: varchar("created_by_person_id", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  priority: mysqlEnum("priority", ["Bassa", "Media", "Alta", "Critica"]).default("Media").notNull(),
  severity: mysqlEnum("severity", ["Bassa", "Media", "Alta", "Critica"]).default("Media").notNull(),
  status: mysqlEnum("status", [
    "Nuova",
    "Presa in carico",
    "In lavorazione",
    "Richiesta integrazione",
    "Integrata",
    "Risolta",
    "Chiusa",
  ]).default("Nuova").notNull(),
  category: mysqlEnum("category", ["Sicurezza", "Ambiente", "Attrezzature", "Procedura", "Altro"]).notNull(),
  type: mysqlEnum("type", ["Pericolo", "Incidente", "Near miss", "Non conformita", "Suggerimento"]).notNull(),
  assignedToUserId: varchar("assigned_to_user_id", { length: 64 }),
  responsibleUserId: varchar("responsible_user_id", { length: 64 }),
  closedAt: timestamp("closed_at"),
  deletedAt: timestamp("deleted_at"),
  deletedByUserId: varchar("deleted_by_user_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("idx_segnalazioni_tenant_code").on(table.tenantId, table.code),
  index("idx_segnalazioni_scope").on(table.tenantId, table.companyId, table.contractId, table.siteId),
  index("idx_segnalazioni_plant_area").on(table.tenantId, table.companyId, table.plantId, table.areaId),
  index("idx_segnalazioni_created_by").on(table.tenantId, table.createdByUserId),
  index("idx_segnalazioni_assigned_to").on(table.tenantId, table.assignedToUserId),
  index("idx_segnalazioni_status").on(table.tenantId, table.status),
  index("idx_segnalazioni_deleted").on(table.deletedAt),
]);

export type SegnalazioneRecord = typeof segnalazioni.$inferSelect;

export const segnalazioneComments = mysqlTable("segnalazione_comments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  segnalazioneId: varchar("segnalazione_id", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }).notNull(),
  authorUserId: varchar("author_user_id", { length: 64 }),
  authorName: varchar("author_name", { length: 255 }),
  body: text("body").notNull(),
  public: boolean("public").default(true).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_segnalazione_comments_report").on(table.tenantId, table.segnalazioneId),
  index("idx_segnalazione_comments_author").on(table.tenantId, table.authorUserId),
  index("idx_segnalazione_comments_deleted").on(table.deletedAt),
  foreignKey({
    name: "fk_segnalazione_comments_report_id",
    columns: [table.segnalazioneId],
    foreignColumns: [segnalazioni.id],
  }),
]);

export type SegnalazioneCommentRecord = typeof segnalazioneComments.$inferSelect;

export const segnalazioneAttachments = mysqlTable("segnalazione_attachments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  segnalazioneId: varchar("segnalazione_id", { length: 64 }).notNull(),
  commentId: varchar("comment_id", { length: 64 }),
  comunicazioneId: varchar("comunicazione_id", { length: 64 }),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 160 }).notNull(),
  fileSize: int("file_size").notNull(),
  attachmentType: mysqlEnum("attachment_type", ["Foto", "Documento", "Altro"]).default("Altro").notNull(),
  description: text("description"),
  checksum: varchar("checksum", { length: 128 }),
  storageKey: varchar("storage_key", { length: 512 }),
  uploadedByUserId: varchar("uploaded_by_user_id", { length: 64 }),
  uploadedByName: varchar("uploaded_by_name", { length: 255 }),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_segnalazione_attachments_report").on(table.tenantId, table.segnalazioneId),
  index("idx_segnalazione_attachments_comment").on(table.commentId),
  index("idx_segnalazione_attachments_uploader").on(table.tenantId, table.uploadedByUserId),
  index("idx_segnalazione_attachments_deleted").on(table.deletedAt),
  foreignKey({
    name: "fk_segnalazione_attachments_report_id",
    columns: [table.segnalazioneId],
    foreignColumns: [segnalazioni.id],
  }),
  foreignKey({
    name: "fk_segnalazione_attachments_comment_id",
    columns: [table.commentId],
    foreignColumns: [segnalazioneComments.id],
  }),
]);

export type SegnalazioneAttachmentRecord = typeof segnalazioneAttachments.$inferSelect;

export const segnalazioneWorkflowEvents = mysqlTable("segnalazione_workflow_events", {
  id: varchar("id", { length: 64 }).primaryKey(),
  segnalazioneId: varchar("segnalazione_id", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  fromStatus: mysqlEnum("from_status", [
    "Nuova",
    "Presa in carico",
    "In lavorazione",
    "Richiesta integrazione",
    "Integrata",
    "Risolta",
    "Chiusa",
  ]),
  toStatus: mysqlEnum("to_status", [
    "Nuova",
    "Presa in carico",
    "In lavorazione",
    "Richiesta integrazione",
    "Integrata",
    "Risolta",
    "Chiusa",
  ]).notNull(),
  actorUserId: varchar("actor_user_id", { length: 64 }),
  actorName: varchar("actor_name", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_segnalazione_workflow_report").on(table.tenantId, table.segnalazioneId, table.createdAt),
  index("idx_segnalazione_workflow_actor").on(table.tenantId, table.actorUserId),
  foreignKey({
    name: "fk_segnalazione_workflow_report_id",
    columns: [table.segnalazioneId],
    foreignColumns: [segnalazioni.id],
  }),
]);

export type SegnalazioneWorkflowEventRecord = typeof segnalazioneWorkflowEvents.$inferSelect;

export const segnalazioneAcknowledgements = mysqlTable("segnalazione_acknowledgements", {
  id: varchar("id", { length: 64 }).primaryKey(),
  segnalazioneId: varchar("segnalazione_id", { length: 64 }).notNull(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }).notNull(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  personId: varchar("person_id", { length: 64 }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").notNull(),
}, (table) => [
  uniqueIndex("idx_segnalazione_ack_unique").on(table.tenantId, table.segnalazioneId, table.userId),
  index("idx_segnalazione_ack_user").on(table.tenantId, table.userId),
  foreignKey({
    name: "fk_segnalazione_ack_report_id",
    columns: [table.segnalazioneId],
    foreignColumns: [segnalazioni.id],
  }),
]);

export type SegnalazioneAcknowledgementRecord = typeof segnalazioneAcknowledgements.$inferSelect;

// ─── Audit Log Entries ─────────────────────────────────────────
export const auditLogEntries = mysqlTable("audit_log_entries", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  module: varchar("module", { length: 80 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 64 }).notNull(),
  actorPersonId: varchar("actor_person_id", { length: 64 }),
  actorRole: varchar("actor_role", { length: 80 }),
  occurredAt: timestamp("occurred_at").notNull(),
  correlationId: varchar("correlation_id", { length: 128 }).notNull(),
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_entries_tenant_occurred").on(table.tenantId, table.occurredAt),
  index("idx_audit_entries_entity").on(table.tenantId, table.module, table.entityType, table.entityId),
  index("idx_audit_entries_correlation").on(table.correlationId),
  index("idx_audit_entries_actor").on(table.actorUserId),
]);

export type AuditLogEntryRecord = typeof auditLogEntries.$inferSelect;

export const notificationOutbox = mysqlTable("notification_outbox", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 64 }).notNull(),
  companyId: varchar("company_id", { length: 64 }),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  module: varchar("module", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 64 }),
  occurredAt: timestamp("occurred_at").notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  status: mysqlEnum("status", ["pending", "processing", "processed", "failed"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  availableAt: timestamp("available_at").notNull(),
  processedAt: timestamp("processed_at"),
  lastErrorCode: varchar("last_error_code", { length: 120 }),
  correlationId: varchar("correlation_id", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notification_outbox_status_available").on(table.status, table.availableAt),
  index("idx_notification_outbox_tenant_status").on(table.tenantId, table.status),
  index("idx_notification_outbox_correlation").on(table.correlationId),
  index("idx_notification_outbox_entity").on(table.entityType, table.entityId),
]);

export type NotificationOutboxRecord = typeof notificationOutbox.$inferSelect;

// ─── Audit Logs ─────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  userName: varchar("user_name", { length: 255 }),
  userRole: varchar("user_role", { length: 50 }),
  action: mysqlEnum("action", [
    "create",
    "update",
    "delete",
    "view",
    "login",
    "logout",
    "import",
    "export",
    "upload",
    "download",
    "approve",
    "reject",
  ]).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: bigint("entity_id", { mode: "number", unsigned: true }),
  entityName: varchar("entity_name", { length: 255 }),
  fieldName: varchar("field_name", { length: 100 }),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  module: varchar("module", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_user").on(table.userId),
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_action").on(table.action),
  index("idx_audit_created").on(table.createdAt),
]);

// ─── Branding ───────────────────────────────────────────────────
export const branding = mysqlTable("branding", {
  id: serial("id").primaryKey(),
  appName: varchar("app_name", { length: 255 }).default("Logos Safety"),
  logoUrl: text("logo_url"),
  logoWidth: int("logo_width").default(140),
  faviconUrl: text("favicon_url"),
  primaryColor: varchar("primary_color", { length: 20 }).default("#1E40AF"),
  primaryHover: varchar("primary_hover", { length: 20 }).default("#1E3A8A"),
  accentColor: varchar("accent_color", { length: 20 }).default("#3B82F6"),
  sidebarBg: varchar("sidebar_bg", { length: 20 }).default("#FFFFFF"),
  sidebarText: varchar("sidebar_text", { length: 20 }).default("#4B5563"),
  sidebarActiveBg: varchar("sidebar_active_bg", { length: 20 }).default("#1E40AF"),
  sidebarActiveText: varchar("sidebar_active_text", { length: 20 }).default("#FFFFFF"),
  topbarBg: varchar("topbar_bg", { length: 20 }).default("#FFFFFF"),
  canvasBg: varchar("canvas_bg", { length: 20 }).default("#F0F2F5"),
  statusGreen: varchar("status_green", { length: 20 }).default("#059669"),
  statusYellow: varchar("status_yellow", { length: 20 }).default("#D97706"),
  statusRed: varchar("status_red", { length: 20 }).default("#DC2626"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Branding = typeof branding.$inferSelect;
