import type {
  OperationalScopeBoundary,
  OperationalScopeSelection,
  OrganizationalScopeActor,
} from "./types";

function cleanScope(scope: OperationalScopeBoundary): OperationalScopeBoundary {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    contractId: scope.contractId || undefined,
    siteId: scope.siteId || undefined,
    plantId: scope.plantId || undefined,
    areaId: scope.areaId || undefined,
  };
}

export function getActorOperationalScopes(actor: OrganizationalScopeActor): OperationalScopeBoundary[] {
  const assignedScopes = actor.assignedScopes?.length
    ? actor.assignedScopes
    : [actor.organizationalScope];

  return assignedScopes.map(cleanScope);
}

export function isWithinOperationalScope(
  target: OperationalScopeBoundary,
  allowed: OperationalScopeBoundary,
): boolean {
  if (target.tenantId !== allowed.tenantId) return false;
  if (target.companyId !== allowed.companyId) return false;
  if (allowed.contractId && target.contractId !== allowed.contractId) return false;
  if (allowed.siteId && target.siteId !== allowed.siteId) return false;
  if (allowed.plantId && target.plantId !== allowed.plantId) return false;
  if (allowed.areaId && target.areaId !== allowed.areaId) return false;
  return true;
}

export function isOperationalScopeAllowed(
  actor: OrganizationalScopeActor,
  target: OperationalScopeBoundary,
): boolean {
  if (!actor.active) return false;
  if (actor.canAccessAllTenants !== true && target.tenantId !== actor.tenantId) return false;
  if (target.companyId !== actor.companyId) return false;

  return getActorOperationalScopes(actor).some((scope) =>
    isWithinOperationalScope(target, scope),
  );
}

export function hasOperationalSelection(selection?: OperationalScopeSelection): boolean {
  return Boolean(
    selection?.contractId ||
    selection?.siteId ||
    selection?.plantId ||
    selection?.areaId,
  );
}
