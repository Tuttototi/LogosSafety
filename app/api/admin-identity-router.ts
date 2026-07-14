import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, isNull, like, ne, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";
import {
  companies,
  contracts,
  jobRoles,
  microclimateSites,
  sites,
  userOrganizationScopes,
  users,
  workers,
} from "@db/schema";
import {
  Permission,
  Role,
  type OrganizationalScope,
  type Role as CoreRole,
} from "@/modules/core/domain";
import { createCoreIdentityService } from "./core/identity";
import { createRouter, authedQuery, logAudit } from "./middleware";
import { getDb } from "./queries/connection";
import type { TrpcContext } from "./context";

const ADMIN_ROLE_VALUES = [
  Role.Admin,
  Role.Rspp,
  Role.Aspp,
  Role.ResponsabileSicurezza,
  Role.OperatoreSicurezza,
  Role.CapoArea,
  Role.CapoImpianto,
  Role.ReferenteCommessa,
  Role.Operatore,
  Role.Dipendente,
  Role.Segnalatore,
] as const satisfies readonly CoreRole[];
const ROLE_SCHEMA = z.enum(ADMIN_ROLE_VALUES);
type AdminAssignableRole = z.infer<typeof ROLE_SCHEMA>;

const ROLE_LABELS: Record<AdminAssignableRole, string> = {
  [Role.Admin]: "Admin",
  [Role.Rspp]: "RSPP",
  [Role.Aspp]: "ASPP",
  [Role.ResponsabileSicurezza]: "Responsabile Sicurezza",
  [Role.OperatoreSicurezza]: "Operatore Sicurezza",
  [Role.CapoArea]: "Capo Area",
  [Role.CapoImpianto]: "Capo Impianto",
  [Role.ReferenteCommessa]: "Referente Commessa",
  [Role.Operatore]: "Operatore",
  [Role.Dipendente]: "Dipendente",
  [Role.Segnalatore]: "Segnalatore",
};

export const ADMIN_ROLE_OPTIONS = ADMIN_ROLE_VALUES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

const OPERATIONAL_IDENTITY_ROLE_VALUES = [
  Role.Operatore,
  Role.Dipendente,
] as const satisfies readonly AdminAssignableRole[];

const OPERATIONAL_IDENTITY_ROLE_OPTIONS = OPERATIONAL_IDENTITY_ROLE_VALUES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

type IdentityManagementActor = {
  companyId: number;
  userId: number;
  role: CoreRole;
  canManageAllRoles: boolean;
  assignableRoles: readonly AdminAssignableRole[];
  organizationalScope: OrganizationalScope;
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as AdminAssignableRole] ?? role;
}

const listInputSchema = z.object({
  search: z.string().trim().max(120).optional(),
  companyId: z.number().int().positive().optional(),
  role: ROLE_SCHEMA.optional(),
  personActive: z.boolean().optional(),
  accountPresent: z.boolean().optional(),
  accountActive: z.boolean().optional(),
}).strict().optional();

const scopeInputSchema = z.object({
  companyId: z.number().int().positive(),
  siteId: z.number().int().positive().nullable().optional(),
  contractId: z.number().int().positive().nullable().optional(),
  plantId: z.number().int().positive().nullable().optional(),
}).strict();

const personInputSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  fiscalCode: z.string().trim().min(16).max(16),
  birthDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthPlace: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  companyId: z.number().int().positive(),
  siteId: z.number().int().positive().nullable().optional(),
  contractId: z.number().int().positive().nullable().optional(),
  jobRoleId: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true),
}).strict();

const accountInputSchema = z.object({
  enabled: z.boolean(),
  role: ROLE_SCHEMA.optional(),
  active: z.boolean().default(true),
  scope: scopeInputSchema.optional(),
}).strict();

const createPersonInputSchema = personInputSchema.extend({
  account: accountInputSchema.optional(),
}).strict();

const updatePersonInputSchema = personInputSchema.extend({
  id: z.number().int().positive(),
}).strict();

const personIdInputSchema = z.object({
  personId: z.number().int().positive(),
}).strict();

const enableAccountInputSchema = personIdInputSchema.extend({
  role: ROLE_SCHEMA,
  active: z.boolean().default(true),
  scope: scopeInputSchema,
}).strict();

const updateAccountStatusInputSchema = personIdInputSchema.extend({
  active: z.boolean(),
}).strict();

const assignRoleInputSchema = personIdInputSchema.extend({
  role: ROLE_SCHEMA,
}).strict();

const updateScopeInputSchema = personIdInputSchema.extend({
  scope: scopeInputSchema,
}).strict();

export function normalizeFiscalCode(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized : null;
}

export function maskFiscalCode(value: string | null | undefined): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return "";
  return `${normalized.slice(0, 3)}**********${normalized.slice(-3)}`;
}

function omitFiscalCode<T extends { fiscalCode: unknown }>(row: T): Omit<T, "fiscalCode"> {
  const safeRow = { ...row } as Record<string, unknown>;
  delete safeRow.fiscalCode;
  return safeRow as Omit<T, "fiscalCode">;
}

export function assertAdminIdentityRole(value: string): asserts value is AdminAssignableRole {
  if (!ADMIN_ROLE_VALUES.includes(value as AdminAssignableRole)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ruolo non riconosciuto dal backend",
    });
  }
}

function sanitizeSearch(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function accountUnionId(email: string): string {
  return `local:${email}`;
}

function actorCompanyIdFromString(value: string): number {
  const companyId = Number(value);
  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Perimetro admin non valido",
    });
  }
  return companyId;
}

function isOperationalIdentityRole(role: string): role is (typeof OPERATIONAL_IDENTITY_ROLE_VALUES)[number] {
  return OPERATIONAL_IDENTITY_ROLE_VALUES.includes(role as (typeof OPERATIONAL_IDENTITY_ROLE_VALUES)[number]);
}

function getRoleOptionsForActor(actor: IdentityManagementActor) {
  return actor.canManageAllRoles ? ADMIN_ROLE_OPTIONS : OPERATIONAL_IDENTITY_ROLE_OPTIONS;
}

function assertAssignableRoleForActor(
  actor: IdentityManagementActor,
  role: AdminAssignableRole,
): void {
  if (!actor.assignableRoles.includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Ruolo non assegnabile dal profilo corrente",
    });
  }
}

function assertCanManageExistingAccountRole(
  actor: IdentityManagementActor,
  role: string,
): void {
  if (actor.canManageAllRoles || isOperationalIdentityRole(role)) return;

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Account fuori dal perimetro gestibile dal profilo corrente",
  });
}

function canViewAccountRole(actor: IdentityManagementActor, role: string): boolean {
  return actor.canManageAllRoles || isOperationalIdentityRole(role);
}

function assertScopeInsideActorBoundary(
  input: z.infer<typeof scopeInputSchema>,
  actor: IdentityManagementActor,
): void {
  if (actor.canManageAllRoles) return;

  const scope = actor.organizationalScope;
  const companyId = String(input.companyId);
  if (!scope.allOrganizations && !scope.organizationIds.includes(companyId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Azienda fuori dal perimetro autorizzato",
    });
  }

  const siteId = input.siteId ? String(input.siteId) : null;
  if (!scope.allSites && (!siteId || !scope.siteIds.includes(siteId))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Sede fuori dal perimetro autorizzato",
    });
  }

  const contractId = input.contractId ? String(input.contractId) : null;
  if (!scope.allContracts && contractId && !scope.contractIds.includes(contractId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Appalto fuori dal perimetro autorizzato",
    });
  }
}

async function resolveIdentityManagementActor(ctx: TrpcContext): Promise<IdentityManagementActor> {
  const actor = await createCoreIdentityService().resolveActorContext(ctx.user);
  const permissions = new Set(actor.permissions);
  const canManageAllRoles = permissions.has(Permission.AdminIdentityManage);
  const canManageOperationalRoles = permissions.has(Permission.AdminIdentityManageOperational);

  if (!actor.active || (!canManageAllRoles && !canManageOperationalRoles)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Funzione riservata ai profili autorizzati alla gestione identita",
    });
  }

  const userId = Number(actor.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Identita operatore non valida",
    });
  }

  return {
    companyId: actorCompanyIdFromString(actor.companyId),
    userId,
    role: actor.role,
    canManageAllRoles,
    assignableRoles: canManageAllRoles ? ADMIN_ROLE_VALUES : OPERATIONAL_IDENTITY_ROLE_VALUES,
    organizationalScope: actor.organizationalScope,
  };
}

async function assertCompanyInActorScope(companyId: number, actorCompanyId: number): Promise<void> {
  if (companyId !== actorCompanyId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Azienda fuori dal perimetro amministrativo",
    });
  }

  const db = getDb();
  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.active, true)))
    .limit(1);
  if (!company) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Azienda non valida" });
  }
}

async function ensureJobRole(jobRoleId: number | null | undefined, createdBy: number): Promise<number> {
  const db = getDb();
  if (jobRoleId) {
    const [jobRole] = await db
      .select({ id: jobRoles.id })
      .from(jobRoles)
      .where(and(eq(jobRoles.id, jobRoleId), eq(jobRoles.active, true)))
      .limit(1);
    if (!jobRole) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Mansione non valida" });
    }
    return jobRole.id;
  }

  const [existing] = await db
    .select({ id: jobRoles.id })
    .from(jobRoles)
    .where(and(eq(jobRoles.code, "ANAG-UTENTI"), eq(jobRoles.active, true)))
    .limit(1);
  if (existing) return existing.id;

  await db.insert(jobRoles).values({
    name: "Anagrafica e Utenti",
    code: "ANAG-UTENTI",
    description: "Mansione tecnica per anagrafiche create dal modulo Admin",
    riskLevel: "basso",
    requiresMedicalVisit: false,
    active: true,
    createdBy,
  });

  const [created] = await db
    .select({ id: jobRoles.id })
    .from(jobRoles)
    .where(eq(jobRoles.code, "ANAG-UTENTI"))
    .limit(1);
  if (!created) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Mansione tecnica non creata" });
  }
  return created.id;
}

async function validateScope(input: z.infer<typeof scopeInputSchema>, actor: IdentityManagementActor) {
  const db = getDb();
  await assertCompanyInActorScope(input.companyId, actor.companyId);
  assertScopeInsideActorBoundary(input, actor);

  const siteId = input.siteId ?? null;
  const contractId = input.contractId ?? null;
  const plantId = input.plantId ?? null;

  if (siteId) {
    const [site] = await db
      .select({ id: sites.id, companyId: sites.companyId })
      .from(sites)
      .where(and(eq(sites.id, siteId), eq(sites.active, true)))
      .limit(1);
    if (!site || site.companyId !== actor.companyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sede fuori perimetro" });
    }
  }

  if (contractId) {
    const [contract] = await db
      .select({ id: contracts.id, siteId: contracts.siteId, clientCompanyId: contracts.clientCompanyId })
      .from(contracts)
      .where(and(eq(contracts.id, contractId), eq(contracts.active, true)))
      .limit(1);
    if (!contract) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Appalto non valido" });
    }
    if (siteId && contract.siteId && contract.siteId !== siteId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Appalto non coerente con la sede" });
    }
    if (!siteId && contract.clientCompanyId !== actor.companyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Appalto fuori perimetro" });
    }
  }

  if (plantId) {
    const [plant] = await db
      .select({ id: microclimateSites.id, companyId: microclimateSites.companyId, siteId: microclimateSites.siteId })
      .from(microclimateSites)
      .where(and(eq(microclimateSites.id, plantId), eq(microclimateSites.active, true)))
      .limit(1);
    if (!plant || plant.companyId !== actor.companyId || (siteId && plant.siteId && plant.siteId !== siteId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Impianto fuori perimetro" });
    }
  }

  return { companyId: input.companyId, siteId, contractId, plantId };
}

async function validatePersonOrganization(
  input: z.infer<typeof personInputSchema>,
  actor: IdentityManagementActor,
) {
  await assertCompanyInActorScope(input.companyId, actor.companyId);
  return validateScope({
    companyId: input.companyId,
    siteId: input.siteId ?? null,
    contractId: input.contractId ?? null,
  }, actor);
}

async function assertNoDuplicateFiscalCode(
  fiscalCode: string,
  companyId: number,
  excludePersonId?: number,
): Promise<void> {
  const db = getDb();
  const conditions: SQL<unknown>[] = [
    eq(workers.companyId, companyId),
    eq(workers.fiscalCode, fiscalCode),
    isNull(workers.deletedAt),
  ];
  if (excludePersonId) conditions.push(ne(workers.id, excludePersonId));
  const [duplicate] = await db
    .select({ id: workers.id })
    .from(workers)
    .where(and(...conditions))
    .limit(1);
  if (duplicate) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Esiste gia una persona con lo stesso codice fiscale nel perimetro amministrativo",
    });
  }
}

async function getPersonForAdmin(personId: number, actorCompanyId: number) {
  const db = getDb();
  const [person] = await db
    .select()
    .from(workers)
    .where(and(eq(workers.id, personId), eq(workers.companyId, actorCompanyId), isNull(workers.deletedAt)))
    .limit(1);
  if (!person) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Persona non trovata" });
  }
  return person;
}

async function getAccountByEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(2);
  if (rows.length > 1) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Email collegata a piu account: correggere i dati prima di proseguire",
    });
  }
  return rows.at(0) ?? null;
}

async function getActiveScopeByUserId(userId: number) {
  const db = getDb();
  const [scope] = await db
    .select()
    .from(userOrganizationScopes)
    .where(and(eq(userOrganizationScopes.userId, userId), eq(userOrganizationScopes.active, true)))
    .limit(1);
  return scope ?? null;
}

async function upsertUserScope(
  userId: number,
  input: z.infer<typeof scopeInputSchema>,
  actor: IdentityManagementActor,
) {
  const db = getDb();
  const scope = await validateScope(input, actor);
  await db
    .update(userOrganizationScopes)
    .set({ active: false, updatedAt: new Date(), updatedBy: actor.userId })
    .where(eq(userOrganizationScopes.userId, userId));

  const [existing] = await db
    .select({ id: userOrganizationScopes.id })
    .from(userOrganizationScopes)
    .where(
      and(
        eq(userOrganizationScopes.userId, userId),
        eq(userOrganizationScopes.companyId, scope.companyId),
        scope.siteId === null ? isNull(userOrganizationScopes.siteId) : eq(userOrganizationScopes.siteId, scope.siteId),
        scope.contractId === null ? isNull(userOrganizationScopes.contractId) : eq(userOrganizationScopes.contractId, scope.contractId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(userOrganizationScopes)
      .set({ active: true, updatedAt: new Date(), updatedBy: actor.userId })
      .where(eq(userOrganizationScopes.id, existing.id));
  } else {
    await db.insert(userOrganizationScopes).values({
      userId,
      companyId: scope.companyId,
      siteId: scope.siteId,
      contractId: scope.contractId,
      active: true,
      createdBy: actor.userId,
    });
  }

  return scope;
}

async function makePersonDto(personId: number, actor: IdentityManagementActor) {
  const db = getDb();
  const [row] = await db
    .select({
      id: workers.id,
      firstName: workers.firstName,
      lastName: workers.lastName,
      fiscalCode: workers.fiscalCode,
      birthDate: workers.birthDate,
      birthPlace: workers.birthPlace,
      email: workers.email,
      phone: workers.phone,
      companyId: workers.companyId,
      companyName: companies.name,
      siteId: workers.siteId,
      siteName: sites.name,
      contractId: workers.contractId,
      contractName: contracts.name,
      jobRoleId: workers.jobRoleId,
      jobRoleName: jobRoles.name,
      status: workers.status,
      active: workers.active,
      createdAt: workers.createdAt,
      updatedAt: workers.updatedAt,
    })
    .from(workers)
    .leftJoin(companies, eq(workers.companyId, companies.id))
    .leftJoin(sites, eq(workers.siteId, sites.id))
    .leftJoin(contracts, eq(workers.contractId, contracts.id))
    .leftJoin(jobRoles, eq(workers.jobRoleId, jobRoles.id))
    .where(and(eq(workers.id, personId), eq(workers.companyId, actor.companyId), isNull(workers.deletedAt)))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Persona non trovata" });
  }

  const account = await getAccountByEmail(row.email);
  if (account && !canViewAccountRole(actor, account.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Account fuori dal perimetro gestibile dal profilo corrente",
    });
  }
  const scope = account ? await getActiveScopeByUserId(account.id) : null;
  const safeRow = omitFiscalCode(row);
  return {
    ...safeRow,
    fiscalCodeMasked: maskFiscalCode(row.fiscalCode),
    account: account ? {
      id: account.id,
      unionId: account.unionId,
      email: account.email,
      role: account.role as CoreRole,
      roleLabel: getRoleLabel(account.role),
      active: account.active,
      scope: scope ? {
        id: scope.id,
        companyId: scope.companyId,
        siteId: scope.siteId,
        contractId: scope.contractId,
      } : null,
    } : null,
  };
}

async function enableOrUpdateAccount(
  personId: number,
  role: AdminAssignableRole,
  active: boolean,
  scope: z.infer<typeof scopeInputSchema>,
  actor: IdentityManagementActor,
) {
  assertAdminIdentityRole(role);
  assertAssignableRoleForActor(actor, role);
  const db = getDb();
  const person = await getPersonForAdmin(personId, actor.companyId);
  const email = normalizeEmail(person.email);
  if (!email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Serve una email valida per abilitare l'accesso",
    });
  }

  let account = await getAccountByEmail(email);
  if (account) {
    assertCanManageExistingAccountRole(actor, account.role);
    await db
      .update(users)
      .set({
        unionId: account.unionId || accountUnionId(email),
        name: `${person.firstName} ${person.lastName}`.trim(),
        email,
        role,
        active,
        updatedAt: new Date(),
      })
      .where(eq(users.id, account.id));
  } else {
    await db.insert(users).values({
      unionId: accountUnionId(email),
      name: `${person.firstName} ${person.lastName}`.trim(),
      email,
      role,
      active,
      createdBy: actor.userId,
    });
    account = await getAccountByEmail(email);
  }

  if (!account) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Account non creato" });
  }

  await upsertUserScope(account.id, scope, actor);
  return account.id;
}

export const adminIdentityRouter = createRouter({
  roles: authedQuery.query(async ({ ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    return getRoleOptionsForActor(actor);
  }),

  options: authedQuery.query(async ({ ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    const db = getDb();
    const companyRows = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(and(eq(companies.id, actor.companyId), eq(companies.active, true)))
      .orderBy(asc(companies.name));
    const siteRows = await db
      .select({ id: sites.id, name: sites.name, companyId: sites.companyId })
      .from(sites)
      .where(and(eq(sites.companyId, actor.companyId), eq(sites.active, true)))
      .orderBy(asc(sites.name));
    const siteIds = siteRows.map((site) => site.id);
    const contractRows = siteIds.length > 0
      ? await db
        .select({ id: contracts.id, code: contracts.code, name: contracts.name, siteId: contracts.siteId })
        .from(contracts)
        .where(and(inArray(contracts.siteId, siteIds), eq(contracts.active, true)))
        .orderBy(asc(contracts.name))
      : [];
    const plantRows = await db
      .select({ id: microclimateSites.id, name: microclimateSites.name, code: microclimateSites.code, siteId: microclimateSites.siteId })
      .from(microclimateSites)
      .where(and(eq(microclimateSites.companyId, actor.companyId), eq(microclimateSites.active, true)))
      .orderBy(asc(microclimateSites.name));
    const jobRoleRows = await db
      .select({ id: jobRoles.id, name: jobRoles.name })
      .from(jobRoles)
      .where(eq(jobRoles.active, true))
      .orderBy(asc(jobRoles.name));

    return {
      companies: companyRows,
      sites: siteRows,
      contracts: contractRows,
      plants: plantRows,
      jobRoles: jobRoleRows,
      roles: getRoleOptionsForActor(actor),
    };
  }),

  list: authedQuery.input(listInputSchema).query(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    const db = getDb();
    const filters = input ?? {};
    if (filters.companyId) await assertCompanyInActorScope(filters.companyId, actor.companyId);

    const conditions: SQL<unknown>[] = [
      eq(workers.companyId, filters.companyId ?? actor.companyId),
      isNull(workers.deletedAt),
    ];
    const search = sanitizeSearch(filters.search);
    if (search) {
      const wildcard = `%${search}%`;
      conditions.push(or(
        like(workers.firstName, wildcard),
        like(workers.lastName, wildcard),
        like(workers.email, wildcard),
        like(workers.fiscalCode, wildcard),
      )!);
    }
    if (typeof filters.personActive === "boolean") {
      conditions.push(eq(workers.active, filters.personActive));
    }

    const rows = await db
      .select({
        id: workers.id,
        firstName: workers.firstName,
        lastName: workers.lastName,
        fiscalCode: workers.fiscalCode,
        email: workers.email,
        phone: workers.phone,
        companyId: workers.companyId,
        companyName: companies.name,
        siteId: workers.siteId,
        siteName: sites.name,
        contractId: workers.contractId,
        contractName: contracts.name,
        status: workers.status,
        active: workers.active,
      })
      .from(workers)
      .leftJoin(companies, eq(workers.companyId, companies.id))
      .leftJoin(sites, eq(workers.siteId, sites.id))
      .leftJoin(contracts, eq(workers.contractId, contracts.id))
      .where(and(...conditions))
      .orderBy(asc(workers.lastName), asc(workers.firstName));

    const emails = rows.flatMap((row) => row.email ? [row.email] : []);
    const accountRows = emails.length > 0
      ? await db.select().from(users).where(inArray(users.email, emails))
      : [];
    const accountByEmail = new Map(accountRows.map((account) => [account.email, account]));

    return rows
      .map((row) => {
        const account = row.email ? accountByEmail.get(row.email) ?? null : null;
        const safeRow = omitFiscalCode(row);
        return {
          ...safeRow,
          fiscalCodeMasked: maskFiscalCode(row.fiscalCode),
          account: account ? {
            id: account.id,
            role: account.role as CoreRole,
            roleLabel: getRoleLabel(account.role),
            active: account.active,
          } : null,
        };
      })
      .filter((row) => {
        if (row.account && !canViewAccountRole(actor, row.account.role)) {
          return false;
        }
        if (typeof filters.accountPresent === "boolean" && Boolean(row.account) !== filters.accountPresent) {
          return false;
        }
        if (typeof filters.accountActive === "boolean" && row.account?.active !== filters.accountActive) {
          return false;
        }
        if (filters.role && row.account?.role !== filters.role) {
          return false;
        }
        return true;
      });
  }),

  detail: authedQuery.input(personIdInputSchema).query(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    return makePersonDto(input.personId, actor);
  }),

  createPerson: authedQuery.input(createPersonInputSchema).mutation(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    const organization = await validatePersonOrganization(input, actor);
    const fiscalCode = normalizeFiscalCode(input.fiscalCode);
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    await assertNoDuplicateFiscalCode(fiscalCode, organization.companyId);
    const jobRoleId = await ensureJobRole(input.jobRoleId, actor.userId);
    const db = getDb();

    await db.insert(workers).values({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      fiscalCode,
      birthDate: input.birthDate,
      birthPlace: input.birthPlace.trim(),
      companyId: organization.companyId,
      siteId: organization.siteId,
      contractId: organization.contractId,
      jobRoleId,
      hireDate: new Date().toISOString().slice(0, 10),
      status: input.active ? "attivo" : "cessato",
      requiresMedicalVisit: false,
      email,
      phone,
      active: input.active,
      createdBy: actor.userId,
    });

    const [created] = await db
      .select({ id: workers.id })
      .from(workers)
      .where(and(eq(workers.fiscalCode, fiscalCode), eq(workers.companyId, organization.companyId), isNull(workers.deletedAt)))
      .orderBy(asc(workers.id))
      .limit(1);
    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Persona non creata" });
    }

    await logAudit(ctx, "create", "workers", {
      entityId: created.id,
      entityName: `${input.firstName.trim()} ${input.lastName.trim()}`,
      module: "anagrafiche_utenti",
      reason: "Persona creata",
    });

    if (input.account?.enabled) {
      const role = input.account.role ?? (actor.canManageAllRoles ? Role.Segnalatore : Role.Dipendente);
      assertAssignableRoleForActor(actor, role);
      await enableOrUpdateAccount(
        created.id,
        role,
        input.account.active,
        input.account.scope ?? { companyId: organization.companyId, siteId: organization.siteId, contractId: organization.contractId },
        actor,
      );
      await logAudit(ctx, "create", "users", {
        entityId: created.id,
        entityName: `${input.firstName.trim()} ${input.lastName.trim()}`,
        module: "anagrafiche_utenti",
        reason: "Account abilitato",
        newValue: getRoleLabel(role),
      });
    }

    return makePersonDto(created.id, actor);
  }),

  updatePerson: authedQuery.input(updatePersonInputSchema).mutation(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    await getPersonForAdmin(input.id, actor.companyId);
    const organization = await validatePersonOrganization(input, actor);
    const fiscalCode = normalizeFiscalCode(input.fiscalCode);
    await assertNoDuplicateFiscalCode(fiscalCode, organization.companyId, input.id);
    const jobRoleId = await ensureJobRole(input.jobRoleId, actor.userId);
    const db = getDb();

    await db
      .update(workers)
      .set({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        fiscalCode,
        birthDate: input.birthDate,
        birthPlace: input.birthPlace.trim(),
        companyId: organization.companyId,
        siteId: organization.siteId,
        contractId: organization.contractId,
        jobRoleId,
        status: input.active ? "attivo" : "cessato",
        email: normalizeEmail(input.email),
        phone: normalizePhone(input.phone),
        active: input.active,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(eq(workers.id, input.id));

    await logAudit(ctx, "update", "workers", {
      entityId: input.id,
      entityName: `${input.firstName.trim()} ${input.lastName.trim()}`,
      module: "anagrafiche_utenti",
      reason: "Persona modificata",
    });

    return makePersonDto(input.id, actor);
  }),

  enableAccount: authedQuery.input(enableAccountInputSchema).mutation(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    const accountId = await enableOrUpdateAccount(input.personId, input.role, input.active, input.scope, actor);
    await logAudit(ctx, "create", "users", {
      entityId: accountId,
      module: "anagrafiche_utenti",
      reason: "Account abilitato",
      newValue: getRoleLabel(input.role),
    });
    return makePersonDto(input.personId, actor);
  }),

  updateAccountStatus: authedQuery.input(updateAccountStatusInputSchema).mutation(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    const person = await getPersonForAdmin(input.personId, actor.companyId);
    const account = await getAccountByEmail(person.email);
    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account non trovato" });
    }
    assertCanManageExistingAccountRole(actor, account.role);
    await getDb()
      .update(users)
      .set({ active: input.active, updatedAt: new Date() })
      .where(eq(users.id, account.id));
    await logAudit(ctx, "update", "users", {
      entityId: account.id,
      entityName: `${person.firstName} ${person.lastName}`,
      module: "anagrafiche_utenti",
      reason: input.active ? "Account riattivato" : "Account bloccato",
      newValue: input.active ? "attivo" : "bloccato",
    });
    return makePersonDto(input.personId, actor);
  }),

  assignRole: authedQuery.input(assignRoleInputSchema).mutation(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    assertAssignableRoleForActor(actor, input.role);
    const person = await getPersonForAdmin(input.personId, actor.companyId);
    const account = await getAccountByEmail(person.email);
    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account non trovato" });
    }
    assertCanManageExistingAccountRole(actor, account.role);
    await getDb()
      .update(users)
      .set({ role: input.role, updatedAt: new Date() })
      .where(eq(users.id, account.id));
    await logAudit(ctx, "update", "users", {
      entityId: account.id,
      entityName: `${person.firstName} ${person.lastName}`,
      fieldName: "role",
      module: "anagrafiche_utenti",
      reason: "Ruolo modificato",
      oldValue: getRoleLabel(account.role),
      newValue: getRoleLabel(input.role),
    });
    return makePersonDto(input.personId, actor);
  }),

  updateOrganizationalScope: authedQuery.input(updateScopeInputSchema).mutation(async ({ input, ctx }) => {
    const actor = await resolveIdentityManagementActor(ctx);
    const person = await getPersonForAdmin(input.personId, actor.companyId);
    const account = await getAccountByEmail(person.email);
    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account non trovato" });
    }
    assertCanManageExistingAccountRole(actor, account.role);
    const scope = await upsertUserScope(account.id, input.scope, actor);
    await logAudit(ctx, "update", "user_organization_scopes", {
      entityId: account.id,
      entityName: `${person.firstName} ${person.lastName}`,
      module: "anagrafiche_utenti",
      reason: "Scope organizzativo modificato",
      newValue: JSON.stringify({
        companyId: scope.companyId,
        siteId: scope.siteId,
        contractId: scope.contractId,
      }),
    });
    return makePersonDto(input.personId, actor);
  }),
});
