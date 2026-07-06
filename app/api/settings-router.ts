import { z } from "zod";
import { createRouter, operatoreQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import { companies, sites, jobRoles, risks, trainingTypes } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { createCompanySchema, updateCompanySchema } from "./company-validation";

export const settingsRouter = createRouter({
  companies: operatoreQuery.query(async () => {
    const db = getDb();
    const companyRows = await db
      .select()
      .from(companies)
      .where(eq(companies.active, true))
      .orderBy(companies.name);
    const siteRows = await db
      .select()
      .from(sites)
      .where(eq(sites.active, true))
      .orderBy(sites.name);

    return companyRows.map(company => ({
      ...company,
      sites: siteRows.filter(site => site.companyId === company.id),
    }));
  }),

  createCompany: operatoreQuery.input(createCompanySchema)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(companies).values({ ...input, vatNumber: input.vatNumber || null, fiscalCode: input.fiscalCode || null, address: input.address || null, city: input.city || null, province: input.province || null, zipCode: input.zipCode || null, phone: input.phone || null, email: input.email || null, createdBy: ctx.user.id });
      await logAudit(ctx, "create", "companies", { entityName: input.name, module: "impostazioni" });
      return result;
    }),

  updateCompany: operatoreQuery.input(updateCompanySchema)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const existing = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      if (existing.length === 0) throw new Error("Azienda non trovata");
      const oldName = existing[0].name;
      await db.update(companies).set({ ...data, vatNumber: data.vatNumber || null, fiscalCode: data.fiscalCode || null, address: data.address || null, city: data.city || null, province: data.province || null, zipCode: data.zipCode || null, phone: data.phone || null, email: data.email || null, updatedBy: ctx.user.id, updatedAt: new Date() }).where(eq(companies.id, id));
      await logAudit(ctx, "update", "companies", { entityId: id, entityName: data.name ?? oldName, module: "impostazioni", reason: `Modifica azienda: ${oldName}` });
      return { success: true };
    }),

  deleteCompany: operatoreQuery.input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(companies).where(eq(companies.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Azienda non trovata");
      await db.update(companies).set({ active: false, updatedBy: ctx.user.id, updatedAt: new Date() }).where(eq(companies.id, input.id));
      await logAudit(ctx, "delete", "companies", { entityId: input.id, entityName: existing[0].name, module: "impostazioni", reason: `Eliminazione azienda: ${existing[0].name}` });
      return { success: true };
    }),

  exportCompanies: operatoreQuery.query(async ({ ctx }) => {
    const db = getDb();
    const data = await db.select({
      id: companies.id,
      name: companies.name,
      vatNumber: companies.vatNumber,
      fiscalCode: companies.fiscalCode,
      address: companies.address,
      city: companies.city,
      province: companies.province,
      zipCode: companies.zipCode,
      phone: companies.phone,
      email: companies.email,
      pec: companies.pec,
      isCooperative: companies.isCooperative,
    }).from(companies).where(eq(companies.active, true)).orderBy(companies.name);
    await logAudit(ctx, "export", "companies", { module: "impostazioni", reason: `Export ${data.length} aziende` });
    return data;
  }),

  sites: operatoreQuery.input(z.object({ companyId: z.number() }).optional()).query(async ({ input }) => {
    const db = getDb();
    const conditions = [eq(sites.active, true)];
    if (input?.companyId) conditions.push(eq(sites.companyId, input.companyId));
    return db.query.sites.findMany({ where: and(...conditions), with: { company: true }, orderBy: [sites.name] });
  }),

  createSite: operatoreQuery.input(z.object({ companyId: z.number(), name: z.string().min(1), code: z.string().optional(), address: z.string().optional(), city: z.string().optional(), province: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(sites).values({ ...input, code: input.code || null, address: input.address || null, city: input.city || null, province: input.province || null, createdBy: ctx.user.id });
      await logAudit(ctx, "create", "sites", { entityName: input.name, module: "impostazioni" });
      return result;
    }),

  updateSite: operatoreQuery.input(z.object({ id: z.number(), companyId: z.number(), name: z.string().min(1), code: z.string().optional(), address: z.string().optional(), city: z.string().optional(), province: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      const existing = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
      if (existing.length === 0) throw new Error("Sede non trovata");
      const oldName = existing[0].name;
      await db.update(sites).set({ ...data, code: data.code || null, address: data.address || null, city: data.city || null, province: data.province || null, updatedBy: ctx.user.id, updatedAt: new Date() }).where(eq(sites.id, id));
      await logAudit(ctx, "update", "sites", { entityId: id, entityName: data.name ?? oldName, module: "impostazioni", reason: `Modifica sede: ${oldName}` });
      return { success: true };
    }),

  deleteSite: operatoreQuery.input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await db.select().from(sites).where(eq(sites.id, input.id)).limit(1);
      if (existing.length === 0) throw new Error("Sede non trovata");
      await db.update(sites).set({ active: false, updatedBy: ctx.user.id, updatedAt: new Date() }).where(eq(sites.id, input.id));
      await logAudit(ctx, "delete", "sites", { entityId: input.id, entityName: existing[0].name, module: "impostazioni", reason: `Eliminazione sede: ${existing[0].name}` });
      return { success: true };
    }),

  exportSites: operatoreQuery.query(async ({ ctx }) => {
    const db = getDb();
    const data = await db.select({
      id: sites.id,
      name: sites.name,
      code: sites.code,
      address: sites.address,
      city: sites.city,
      province: sites.province,
      companyId: sites.companyId,
    }).from(sites).where(eq(sites.active, true)).orderBy(sites.name);
    await logAudit(ctx, "export", "sites", { module: "impostazioni", reason: `Export ${data.length} sedi` });
    return data;
  }),

  jobRoles: operatoreQuery.query(async () => {
    const db = getDb();
    return db.query.jobRoles.findMany({
      where: eq(jobRoles.active, true),
      with: { jobRoleRisks: { with: { risk: true } }, jobRoleTraining: { with: { trainingType: true } } },
      orderBy: [jobRoles.name],
    });
  }),

  risks: operatoreQuery.query(async () => {
    const db = getDb();
    return db.query.risks.findMany({ where: eq(risks.active, true), orderBy: [risks.name] });
  }),

  trainingTypes: operatoreQuery.query(async () => {
    const db = getDb();
    return db.query.trainingTypes.findMany({ where: eq(trainingTypes.active, true), orderBy: [trainingTypes.name] });
  }),
});
