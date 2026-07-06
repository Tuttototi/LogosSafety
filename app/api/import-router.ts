import { z } from "zod";
import { createRouter, medicoQuery, operatoreQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import { workers, trainingCourses, trainingCertificates, medicalVisits, jobRoles, companies, sites, trainingTypes } from "@db/schema";
import { eq, and, count, or, type SQL } from "drizzle-orm";
import {
  type CompanyImportRow,
  importCompanyRowSchema,
} from "./company-validation";

const duplicateActionSchema = z.enum(["ignora", "aggiorna", "blocca"]);
type WorkerGender = typeof workers.$inferInsert.gender;
type CourseModality = typeof trainingCourses.$inferInsert.modality;
type MedicalVisitType = typeof medicalVisits.$inferInsert.visitType;
type MedicalJudgment = typeof medicalVisits.$inferInsert.judgment;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const nullableText = (value?: string) => value || null;

function getCompanyDuplicateCondition(row: CompanyImportRow): SQL | undefined {
  const identityConditions: SQL[] = [eq(companies.name, row.name)];
  if (row.vatNumber) {
    identityConditions.push(eq(companies.vatNumber, row.vatNumber));
  }
  if (row.fiscalCode) {
    identityConditions.push(eq(companies.fiscalCode, row.fiscalCode));
  }

  const identityCondition =
    identityConditions.length === 1
      ? identityConditions[0]
      : or(...identityConditions);

  return identityCondition
    ? and(eq(companies.active, true), identityCondition)
    : undefined;
}

async function findExistingCompany(row: CompanyImportRow) {
  const db = getDb();
  const condition = getCompanyDuplicateCondition(row);
  if (!condition) return null;

  const existing = await db
    .select()
    .from(companies)
    .where(condition)
    .limit(1);

  return existing.length > 0 ? existing[0] : null;
}

export const importRouter = createRouter({
  // Import companies
  importCompanies: operatoreQuery
    .input(z.object({
      rows: z.array(importCompanyRowSchema),
      duplicateAction: duplicateActionSchema.optional().default("ignora"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = { imported: 0, updated: 0, skipped: 0, errors: [] as { row: number; msg: string }[] };
      const { rows, duplicateAction } = input;

      // Pre-check duplicates if action is "blocca" (by name, VAT or fiscal code).
      if (duplicateAction === "blocca") {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const existingCompany = await findExistingCompany(row);
          if (existingCompany) {
            return { imported: 0, updated: 0, skipped: 0, errors: [{ row: i + 2, msg: `Azienda "${row.name}" già presente. Importazione bloccata.` }], blocked: true };
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const existingCompany = await findExistingCompany(row);

          if (existingCompany) {
            if (duplicateAction === "ignora") {
              results.skipped++;
              continue;
            } else if (duplicateAction === "aggiorna") {
              await db.update(companies).set({
                name: row.name,
                vatNumber: row.vatNumber ?? existingCompany.vatNumber,
                fiscalCode: row.fiscalCode ?? existingCompany.fiscalCode,
                address: row.address,
                city: row.city,
                province: row.province,
                zipCode: row.zipCode,
                phone: row.phone ?? existingCompany.phone,
                email: row.email,
                pec: row.pec ?? existingCompany.pec,
                isCooperative: row.isCooperative ?? existingCompany.isCooperative,
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              }).where(eq(companies.id, existingCompany.id));
              results.updated++;
              continue;
            }
            results.errors.push({ row: i + 2, msg: `Azienda "${row.name}" già presente` });
            continue;
          }

          await db.insert(companies).values({
            name: row.name,
            vatNumber: nullableText(row.vatNumber),
            fiscalCode: nullableText(row.fiscalCode),
            address: nullableText(row.address),
            city: nullableText(row.city),
            province: nullableText(row.province),
            zipCode: nullableText(row.zipCode),
            phone: nullableText(row.phone),
            email: nullableText(row.email),
            pec: nullableText(row.pec),
            isCooperative: row.isCooperative ?? false,
            createdBy: ctx.user.id,
          });
          results.imported++;
        } catch (error: unknown) {
          results.errors.push({ row: i + 2, msg: getErrorMessage(error, "Errore sconosciuto") });
        }
      }
      await logAudit(ctx, "import", "companies", { module: "import", reason: `Importate ${results.imported}, aggiornate ${results.updated}, saltate ${results.skipped}, errori ${results.errors.length}` });
      return results;
    }),

  // Import sites
  importSites: operatoreQuery
    .input(z.object({
      rows: z.array(z.object({
        name: z.string().min(1),
        companyName: z.string().min(1),
        code: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        province: z.string().optional(),
      })),
      duplicateAction: duplicateActionSchema.optional().default("ignora"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = { imported: 0, updated: 0, skipped: 0, errors: [] as { row: number; msg: string }[] };
      const { rows, duplicateAction } = input;

      // Pre-check duplicates if action is "blocca" (by name + company)
      if (duplicateAction === "blocca") {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const comps = await db.select().from(companies).where(eq(companies.name, row.companyName)).limit(1);
          if (comps.length > 0) {
            const existing = await db.select({ count: count() }).from(sites)
              .where(and(eq(sites.name, row.name), eq(sites.companyId, comps[0].id), eq(sites.active, true)));
            if (existing[0].count > 0) {
              return { imported: 0, updated: 0, skipped: 0, errors: [{ row: i + 2, msg: `Sede "${row.name}" già presente per azienda "${row.companyName}". Importazione bloccata.` }], blocked: true };
            }
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Resolve company
          const comps = await db.select().from(companies).where(eq(companies.name, row.companyName)).limit(1);
          if (comps.length === 0) { results.errors.push({ row: i + 2, msg: `Azienda "${row.companyName}" non trovata` }); continue; }
          const companyId = comps[0].id;

          // Check duplicate by name + companyId
          const dup = await db.select().from(sites)
            .where(and(eq(sites.name, row.name), eq(sites.companyId, companyId), eq(sites.active, true)))
            .limit(1);
          const existingSite = dup.length > 0 ? dup[0] : null;

          if (existingSite) {
            if (duplicateAction === "ignora") {
              results.skipped++;
              continue;
            } else if (duplicateAction === "aggiorna") {
              await db.update(sites).set({
                code: row.code || existingSite.code,
                address: row.address || existingSite.address,
                city: row.city || existingSite.city,
                province: row.province || existingSite.province,
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              }).where(eq(sites.id, existingSite.id));
              results.updated++;
              continue;
            }
            results.errors.push({ row: i + 2, msg: `Sede "${row.name}" già presente per azienda "${row.companyName}"` });
            continue;
          }

          await db.insert(sites).values({
            name: row.name,
            companyId,
            code: row.code || null,
            address: row.address || null,
            city: row.city || null,
            province: row.province || null,
            createdBy: ctx.user.id,
          });
          results.imported++;
        } catch (error: unknown) {
          results.errors.push({ row: i + 2, msg: getErrorMessage(error, "Errore sconosciuto") });
        }
      }
      await logAudit(ctx, "import", "sites", { module: "import", reason: `Importate ${results.imported}, aggiornate ${results.updated}, saltate ${results.skipped}, errori ${results.errors.length}` });
      return results;
    }),


  // Import workers
  importWorkers: operatoreQuery
    .input(z.object({
      rows: z.array(z.object({
        firstName: z.string().min(1), lastName: z.string().min(1),
        fiscalCode: z.string().optional(), birthDate: z.string().optional(),
        birthPlace: z.string().optional(), gender: z.string().optional(),
        email: z.string().optional(), phone: z.string().optional(),
        jobRoleName: z.string(), companyName: z.string(),
        siteName: z.string().optional(), hireDate: z.string().optional(),
        notes: z.string().optional(),
      })),
      duplicateAction: duplicateActionSchema.optional().default("ignora"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = { imported: 0, updated: 0, skipped: 0, errors: [] as { row: number; msg: string }[] };
      const { rows, duplicateAction } = input;

      // Pre-check duplicates if action is "blocca"
      if (duplicateAction === "blocca") {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row.fiscalCode) {
            const existing = await db.select({ count: count() }).from(workers)
              .where(and(eq(workers.fiscalCode, row.fiscalCode), eq(workers.active, true)));
            if (existing[0].count > 0) {
              return { imported: 0, updated: 0, skipped: 0, errors: [{ row: i + 2, msg: `Codice fiscale "${row.fiscalCode}" già presente. Importazione bloccata per azione "blocca".` }], blocked: true };
            }
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Resolve job role
          const roles = await db.select().from(jobRoles).where(eq(jobRoles.name, row.jobRoleName)).limit(1);
          if (roles.length === 0) { results.errors.push({ row: i + 2, msg: `Mansione "${row.jobRoleName}" non trovata` }); continue; }
          // Resolve company
          const comps = await db.select().from(companies).where(eq(companies.name, row.companyName)).limit(1);
          if (comps.length === 0) { results.errors.push({ row: i + 2, msg: `Azienda "${row.companyName}" non trovata` }); continue; }
          // Resolve site (optional)
          let siteId = null;
          if (row.siteName) {
            const s = await db.select().from(sites).where(and(eq(sites.name, row.siteName), eq(sites.companyId, comps[0].id))).limit(1);
            if (s.length > 0) siteId = s[0].id;
          }
          // Check fiscal code duplicate
          let existingWorker = null;
          if (row.fiscalCode) {
            const dup = await db.select().from(workers)
              .where(and(eq(workers.fiscalCode, row.fiscalCode), eq(workers.active, true)))
              .limit(1);
            if (dup.length > 0) existingWorker = dup[0];
          }

          if (existingWorker) {
            if (duplicateAction === "ignora") {
              results.skipped++;
              continue;
            } else if (duplicateAction === "aggiorna") {
              await db.update(workers).set({
                firstName: row.firstName, lastName: row.lastName,
                fiscalCode: row.fiscalCode || existingWorker.fiscalCode,
                birthDate: row.birthDate || existingWorker.birthDate,
                birthPlace: row.birthPlace || existingWorker.birthPlace,
                gender: (row.gender as WorkerGender) || existingWorker.gender,
                email: row.email || existingWorker.email,
                phone: row.phone || existingWorker.phone,
                companyId: comps[0].id, siteId, jobRoleId: roles[0].id,
                hireDate: row.hireDate || existingWorker.hireDate,
                notes: row.notes || existingWorker.notes,
                requiresMedicalVisit: roles[0].requiresMedicalVisit,
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              }).where(eq(workers.id, existingWorker.id));
              results.updated++;
              continue;
            }
            // blocca - already handled by pre-check, but just in case
            results.errors.push({ row: i + 2, msg: `Codice fiscale "${row.fiscalCode}" già presente` });
            continue;
          }

          await db.insert(workers).values({
            firstName: row.firstName, lastName: row.lastName,
            fiscalCode: row.fiscalCode || null, birthDate: row.birthDate || null,
            birthPlace: row.birthPlace || null, gender: (row.gender as WorkerGender) || null,
            email: row.email || null, phone: row.phone || null,
            companyId: comps[0].id, siteId, jobRoleId: roles[0].id,
            hireDate: row.hireDate || null, notes: row.notes || null,
            status: "attivo", requiresMedicalVisit: roles[0].requiresMedicalVisit,
            createdBy: ctx.user.id,
          });
          results.imported++;
        } catch (error: unknown) {
          results.errors.push({ row: i + 2, msg: getErrorMessage(error, "Errore sconosciuto") });
        }
      }
      await logAudit(ctx, "import", "workers", { module: "import", reason: `Importati ${results.imported}, aggiornati ${results.updated}, saltati ${results.skipped}, errori ${results.errors.length}` });
      return results;
    }),

  // Import certificates
  importCertificates: operatoreQuery
    .input(z.object({
      rows: z.array(z.object({
        lastName: z.string(), firstName: z.string(),
        trainingTypeName: z.string(), courseTitle: z.string(),
        provider: z.string().optional(), courseDate: z.string().optional(),
        expiryDate: z.string().optional(), certificateNumber: z.string().optional(),
        durationHours: z.string().optional(), modality: z.string().optional(),
        notes: z.string().optional(),
      })),
      duplicateAction: duplicateActionSchema.optional().default("ignora"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = { imported: 0, updated: 0, skipped: 0, errors: [] as { row: number; msg: string }[] };
      const { rows, duplicateAction } = input;

      // Pre-check duplicates if action is "blocca"
      if (duplicateAction === "blocca") {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const ws = await db.select().from(workers)
            .where(and(eq(workers.lastName, row.lastName), eq(workers.firstName, row.firstName), eq(workers.active, true)))
            .limit(1);
          if (ws.length > 0) {
            const tt = await db.select().from(trainingTypes).where(eq(trainingTypes.name, row.trainingTypeName)).limit(1);
            if (tt.length > 0) {
              const existingCourse = await db.select().from(trainingCourses)
                .where(and(eq(trainingCourses.title, row.courseTitle), eq(trainingCourses.trainingTypeId, tt[0].id)))
                .limit(1);
              if (existingCourse.length > 0) {
                const dup = await db.select({ count: count() }).from(trainingCertificates)
                  .where(and(eq(trainingCertificates.workerId, ws[0].id), eq(trainingCertificates.courseId, existingCourse[0].id)));
                if (dup[0].count > 0) {
                  return { imported: 0, updated: 0, skipped: 0, errors: [{ row: i + 2, msg: `Attestato già presente per ${row.firstName} ${row.lastName} - ${row.courseTitle}. Importazione bloccata.` }], blocked: true };
                }
              }
            }
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const ws = await db.select().from(workers)
            .where(and(eq(workers.lastName, row.lastName), eq(workers.firstName, row.firstName), eq(workers.active, true)))
            .limit(1);
          if (ws.length === 0) { results.errors.push({ row: i + 2, msg: `Dipendente "${row.firstName} ${row.lastName}" non trovato` }); continue; }
          const tt = await db.select().from(trainingTypes).where(eq(trainingTypes.name, row.trainingTypeName)).limit(1);
          if (tt.length === 0) { results.errors.push({ row: i + 2, msg: `Tipo formazione "${row.trainingTypeName}" non trovato` }); continue; }
          // Create course if not exists
          let courseId: number;
          const existingCourse = await db.select().from(trainingCourses)
            .where(and(eq(trainingCourses.title, row.courseTitle), eq(trainingCourses.trainingTypeId, tt[0].id)))
            .limit(1);
          if (existingCourse.length > 0) {
            courseId = existingCourse[0].id;
          } else {
            const res = await db.insert(trainingCourses).values({
              title: row.courseTitle, trainingTypeId: tt[0].id,
              provider: row.provider || null, courseDate: row.courseDate || null,
              modality: (row.modality as CourseModality) || "presenza",
              durationHours: row.durationHours ? Number(row.durationHours) : null,
              status: "completato", createdBy: ctx.user.id,
            });
            courseId = Number(res[0].insertId);
          }
          // Check duplicate cert
          const dup = await db.select({ count: count() }).from(trainingCertificates)
            .where(and(eq(trainingCertificates.workerId, ws[0].id), eq(trainingCertificates.courseId, courseId)));
          const hasDuplicate = dup[0].count > 0;

          if (hasDuplicate) {
            if (duplicateAction === "ignora") {
              results.skipped++;
              continue;
            } else if (duplicateAction === "aggiorna") {
              const existingCert = await db.select().from(trainingCertificates)
                .where(and(eq(trainingCertificates.workerId, ws[0].id), eq(trainingCertificates.courseId, courseId)))
                .limit(1);
              if (existingCert.length > 0) {
                await db.update(trainingCertificates).set({
                  certificateNumber: row.certificateNumber || existingCert[0].certificateNumber,
                  issueDate: row.courseDate || existingCert[0].issueDate,
                  expiryDate: row.expiryDate || existingCert[0].expiryDate,
                  notes: row.notes || existingCert[0].notes,
                  updatedBy: ctx.user.id,
                  updatedAt: new Date(),
                }).where(eq(trainingCertificates.id, existingCert[0].id));
                results.updated++;
              }
              continue;
            }
            results.errors.push({ row: i + 2, msg: `Attestato già presente per questo dipendente e corso` });
            continue;
          }

          await db.insert(trainingCertificates).values({
            workerId: ws[0].id, courseId,
            certificateNumber: row.certificateNumber || null,
            issueDate: row.courseDate || null, expiryDate: row.expiryDate || null,
            validityStatus: "valido", notes: row.notes || null,
            createdBy: ctx.user.id,
          });
          results.imported++;
        } catch (error: unknown) {
          results.errors.push({ row: i + 2, msg: getErrorMessage(error, "Errore") });
        }
      }
      await logAudit(ctx, "import", "training_certificates", { module: "import", reason: `Importati ${results.imported}, aggiornati ${results.updated}, saltati ${results.skipped}, errori ${results.errors.length}` });
      return results;
    }),

  // Import medical visits
  importVisits: medicoQuery
    .input(z.object({
      rows: z.array(z.object({
        lastName: z.string(), firstName: z.string(), visitType: z.string(),
        doctorName: z.string().optional(), visitDate: z.string().optional(),
        nextVisitDue: z.string().optional(), judgment: z.string(),
        limitationDescription: z.string().optional(),
        prescriptionDescription: z.string().optional(),
        healthProtocol: z.string().optional(), notes: z.string().optional(),
      })),
      duplicateAction: duplicateActionSchema.optional().default("ignora"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = { imported: 0, updated: 0, skipped: 0, errors: [] as { row: number; msg: string }[] };
      const { rows, duplicateAction } = input;

      // Pre-check duplicates if action is "blocca" (same worker + same visit type + same date = duplicate)
      if (duplicateAction === "blocca") {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const ws = await db.select().from(workers)
            .where(and(eq(workers.lastName, row.lastName), eq(workers.firstName, row.firstName), eq(workers.active, true)))
            .limit(1);
          if (ws.length > 0 && row.visitDate) {
            const dup = await db.select({ count: count() }).from(medicalVisits)
              .where(and(
                eq(medicalVisits.workerId, ws[0].id),
                eq(medicalVisits.visitType, row.visitType as MedicalVisitType),
                eq(medicalVisits.visitDate, row.visitDate)
              ));
            if (dup[0].count > 0) {
              return { imported: 0, updated: 0, skipped: 0, errors: [{ row: i + 2, msg: `Visita ${row.visitType} del ${row.visitDate} già presente per ${row.firstName} ${row.lastName}. Importazione bloccata.` }], blocked: true };
            }
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const ws = await db.select().from(workers)
            .where(and(eq(workers.lastName, row.lastName), eq(workers.firstName, row.firstName), eq(workers.active, true)))
            .limit(1);
          if (ws.length === 0) { results.errors.push({ row: i + 2, msg: `Dipendente non trovato` }); continue; }

          // Check duplicate: same worker + same visit type + same date
          let existingVisit = null;
          if (row.visitDate) {
            const dup = await db.select().from(medicalVisits)
              .where(and(
                eq(medicalVisits.workerId, ws[0].id),
                eq(medicalVisits.visitType, row.visitType as MedicalVisitType),
                eq(medicalVisits.visitDate, row.visitDate)
              ))
              .limit(1);
            if (dup.length > 0) existingVisit = dup[0];
          }

          if (existingVisit) {
            if (duplicateAction === "ignora") {
              results.skipped++;
              continue;
            } else if (duplicateAction === "aggiorna") {
              await db.update(medicalVisits).set({
                doctorName: row.doctorName || existingVisit.doctorName,
                nextVisitDue: row.nextVisitDue || existingVisit.nextVisitDue,
                judgment: (row.judgment as MedicalJudgment) || existingVisit.judgment,
                limitationDescription: row.limitationDescription || existingVisit.limitationDescription,
                prescriptionDescription: row.prescriptionDescription || existingVisit.prescriptionDescription,
                healthProtocol: row.healthProtocol || existingVisit.healthProtocol,
                notes: row.notes || existingVisit.notes,
                updatedBy: ctx.user.id,
                updatedAt: new Date(),
              }).where(eq(medicalVisits.id, existingVisit.id));
              results.updated++;
              continue;
            }
            results.errors.push({ row: i + 2, msg: `Visita ${row.visitType} del ${row.visitDate} già presente` });
            continue;
          }

          await db.insert(medicalVisits).values({
            workerId: ws[0].id, visitType: row.visitType as MedicalVisitType,
            doctorName: row.doctorName || null, visitDate: row.visitDate || null,
            nextVisitDue: row.nextVisitDue || null, judgment: row.judgment as MedicalJudgment,
            limitationDescription: row.limitationDescription || null,
            prescriptionDescription: row.prescriptionDescription || null,
            healthProtocol: row.healthProtocol || null,
            requestStatus: "completata", notes: row.notes || null,
            createdBy: ctx.user.id,
          });
          results.imported++;
        } catch (error: unknown) {
          results.errors.push({ row: i + 2, msg: getErrorMessage(error, "Errore") });
        }
      }
      await logAudit(ctx, "import", "medical_visits", { module: "import", reason: `Importate ${results.imported}, aggiornate ${results.updated}, saltate ${results.skipped}, errori ${results.errors.length}` });
      return results;
    }),
});
