import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { auditLogs } from "@db/schema";
import {
  CLINICAL_MEDICAL_ROLES,
  OPERATIONAL_MEDICAL_ROLES,
} from "./medical-access";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

type AuditAction = typeof auditLogs.$inferInsert.action;

export const createRouter = t.router;
export const publicQuery = t.procedure;

// ─── Auth middleware ────────────────────────────────────────────
const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const authedQuery = t.procedure.use(requireAuth);

// Any authenticated user - for read-only operations across roles
export const anyAuthedQuery = t.procedure.use(requireAuth);

// ─── Role-based middleware ──────────────────────────────────────
const ROLES_HIERARCHY: Record<string, number> = {
  admin: 7,
  responsabile_sicurezza: 6,
  operatore_sicurezza: 5,
  medico_competente: 4,
  referente_commessa: 3,
  auditor: 2,
  sola_lettura: 1,
};

function requireMinRole(minRole: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: ErrorMessages.unauthenticated });
    }
    const userLevel = ROLES_HIERARCHY[ctx.user.role] ?? 0;
    const minLevel = ROLES_HIERARCHY[minRole] ?? 999;
    if (userLevel < minLevel) {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

function requireExactRoles(...roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: ErrorMessages.unauthenticated });
    }
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

// ─── Pre-built procedures ───────────────────────────────────────
export const adminQuery = authedQuery.use(requireMinRole("admin"));
export const respSicQuery = authedQuery.use(requireMinRole("responsabile_sicurezza"));
export const operatoreQuery = authedQuery.use(requireMinRole("operatore_sicurezza"));
export const medicalOperationalQuery = authedQuery.use(
  requireExactRoles(...OPERATIONAL_MEDICAL_ROLES)
);
// For medical data export - admin, resp sicurezza, medico competente
export const medicoQuery = authedQuery.use(
  requireExactRoles(...CLINICAL_MEDICAL_ROLES)
);
// For medical data export - same roles as medicoQuery but named explicitly for health data
export const healthDataExportQuery = authedQuery.use(
  requireExactRoles(...CLINICAL_MEDICAL_ROLES)
);
export const referenteQuery = authedQuery.use(requireMinRole("referente_commessa"));
export const auditorQuery = authedQuery.use(requireExactRoles("auditor", "admin", "responsabile_sicurezza"));

// ─── Audit log helper ───────────────────────────────────────────
export async function logAudit(
  ctx: TrpcContext,
  action: string,
  entityType: string,
  opts: {
    entityId?: number;
    entityName?: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    reason?: string;
    module?: string;
  } = {}
) {
  const { getDb } = await import("./queries/connection");
  const { auditLogs } = await import("@db/schema");
  const db = getDb();

  await db.insert(auditLogs).values({
    userId: ctx.user?.id,
    userName: ctx.user?.name ?? "anonimo",
    userRole: ctx.user?.role ?? "unknown",
    action: action as AuditAction,
    entityType,
    entityId: opts.entityId,
    entityName: opts.entityName,
    fieldName: opts.fieldName,
    oldValue: opts.oldValue,
    newValue: opts.newValue,
    reason: opts.reason,
    module: opts.module,
  });
}
