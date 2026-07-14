import { Permission, Role, isRole, type Permission as PermissionValue } from "@/modules/core/domain";

export type ModuleAccessId =
  | "dashboard"
  | "adminIdentity"
  | "workers"
  | "training"
  | "healthSurveillance"
  | "jobRoles"
  | "deadlines"
  | "reports"
  | "reportsSafetyApp"
  | "microclima"
  | "documents"
  | "settings"
  | "audit"
  | "importExport";

export type AccessActor = {
  role?: string | null;
  permissions?: readonly string[] | null;
};

const MODULE_PERMISSION_REQUIREMENTS: Record<Exclude<ModuleAccessId, "reportsSafetyApp">, readonly PermissionValue[]> = {
  dashboard: [Permission.DashboardView],
  adminIdentity: [Permission.AdminIdentityView],
  workers: [Permission.HseOperationalView],
  training: [Permission.FormazioneView],
  healthSurveillance: [Permission.SorveglianzaSanitariaViewOperational],
  jobRoles: [Permission.HseOperationalView],
  deadlines: [Permission.ScadenzeView],
  reports: [
    Permission.SegnalazioniViewOwn,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniManage,
  ],
  microclima: [Permission.MicroclimaView],
  documents: [Permission.DocumentiView],
  settings: [Permission.SettingsManage],
  audit: [Permission.AuditView],
  importExport: [Permission.ImportExportUse],
};

export const ROUTE_MODULE_ACCESS: readonly {
  path: string;
  moduleId: ModuleAccessId;
}[] = [
  { path: "/segnalazioni/app", moduleId: "reportsSafetyApp" },
  { path: "/anagrafiche-utenti", moduleId: "adminIdentity" },
  { path: "/dipendenti", moduleId: "workers" },
  { path: "/formazione", moduleId: "training" },
  { path: "/sorveglianza", moduleId: "healthSurveillance" },
  { path: "/mansioni", moduleId: "jobRoles" },
  { path: "/scadenziario", moduleId: "deadlines" },
  { path: "/segnalazioni", moduleId: "reports" },
  { path: "/microclima", moduleId: "microclima" },
  { path: "/documenti", moduleId: "documents" },
  { path: "/impostazioni", moduleId: "settings" },
  { path: "/audit", moduleId: "audit" },
  { path: "/import-export", moduleId: "importExport" },
  { path: "/", moduleId: "dashboard" },
];

function hasAnyPermission(
  actor: AccessActor | null | undefined,
  permissions: readonly PermissionValue[],
): boolean {
  const actorPermissions = new Set(actor?.permissions ?? []);
  return permissions.some((permission) => actorPermissions.has(permission));
}

export function hasPermission(
  actor: AccessActor | null | undefined,
  permission: PermissionValue,
): boolean {
  return hasAnyPermission(actor, [permission]);
}

export function canAccessModule(
  actor: AccessActor | null | undefined,
  moduleId: ModuleAccessId,
): boolean {
  const role = actor?.role;
  if (!role || !isRole(role)) return false;

  if (moduleId === "reportsSafetyApp") {
    return role === Role.Segnalatore && hasAnyPermission(actor, [Permission.SegnalazioniCreate]);
  }

  if (role === Role.Segnalatore) {
    return false;
  }

  return hasAnyPermission(actor, MODULE_PERMISSION_REQUIREMENTS[moduleId]);
}

export function getModuleForPath(pathname: string): ModuleAccessId | null {
  const normalizedPath = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  const route = ROUTE_MODULE_ACCESS.find((candidate) => {
    if (candidate.path === "/") return normalizedPath === "/";
    return normalizedPath === candidate.path || normalizedPath.startsWith(`${candidate.path}/`);
  });

  return route?.moduleId ?? null;
}

export function canAccessPath(
  actor: AccessActor | null | undefined,
  pathname: string,
): boolean {
  const moduleId = getModuleForPath(pathname);
  if (!moduleId) return false;
  return canAccessModule(actor, moduleId);
}

export function getAuthorizedHomePath(actor: AccessActor | null | undefined): string {
  return actor?.role === Role.Segnalatore ? "/segnalazioni/app" : "/";
}
