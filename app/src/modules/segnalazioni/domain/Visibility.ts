import type { Segnalazione } from "./Segnalazione";
import { SegnalazioniRole, isSegnalazioniRole } from "./Reporter";
import type { SegnalazioniActor, SegnalazioniRole as SegnalazioniRoleType } from "./Reporter";
import { isWithinAnyOrganizationalScope } from "./OrganizationalScope";
import type { OrganizationalScope } from "./OrganizationalScope";

const SELF_VIEW_ROLES: readonly SegnalazioniRoleType[] = [
  SegnalazioniRole.Segnalatore,
  SegnalazioniRole.Dipendente,
  SegnalazioniRole.Operatore,
];

const MANAGEMENT_ROLES: readonly SegnalazioniRoleType[] = [
  SegnalazioniRole.Admin,
  SegnalazioniRole.Rspp,
  SegnalazioniRole.Aspp,
  SegnalazioniRole.Sicurezza,
  SegnalazioniRole.ResponsabileSicurezza,
  SegnalazioniRole.OperatoreSicurezza,
];

const AREA_SCOPE_ROLES: readonly SegnalazioniRoleType[] = [
  SegnalazioniRole.CapoArea,
  SegnalazioniRole.ReferenteCommessa,
];

function hasRole(role: SegnalazioniRoleType, roles: readonly SegnalazioniRoleType[]): boolean {
  return roles.includes(role);
}

function isActiveRecognizedActor(actor: SegnalazioniActor): boolean {
  return Boolean(actor.active && actor.userId && actor.personId && isSegnalazioniRole(actor.role));
}

function getActorScopes(actor: SegnalazioniActor): OrganizationalScope[] {
  return [actor.organizationalScope, ...(actor.assignedScopes ?? [])];
}

function canAccessTenant(actor: SegnalazioniActor, target: OrganizationalScope): boolean {
  return actor.canAccessAllTenants === true || actor.tenantId === target.tenantId;
}

function canAccessScope(actor: SegnalazioniActor, target: OrganizationalScope): boolean {
  if (!isActiveRecognizedActor(actor)) return false;
  if (!canAccessTenant(actor, target)) return false;
  if (actor.companyId === target.companyId && actor.tenantId === target.tenantId) return true;
  return isWithinAnyOrganizationalScope(target, getActorScopes(actor));
}

function isOwnSegnalazione(actor: SegnalazioniActor, segnalazione: Segnalazione): boolean {
  return (
    segnalazione.createdByUserId === actor.userId ||
    segnalazione.createdByPersonId === actor.personId ||
    segnalazione.reporter.userId === actor.userId ||
    segnalazione.reporter.personId === actor.personId
  );
}

function hasPlantScope(actor: SegnalazioniActor, target: OrganizationalScope): boolean {
  if (!target.plantId) return false;
  return getActorScopes(actor).some(
    (scope) =>
      scope.tenantId === target.tenantId &&
      scope.companyId === target.companyId &&
      scope.plantId === target.plantId,
  );
}

/**
 * A report can be created only by a known, active actor inside an allowed scope.
 */
export function canCreateSegnalazione(actor: SegnalazioniActor, targetScope: OrganizationalScope): boolean {
  return canAccessScope(actor, targetScope);
}

/**
 * Visibility is tenant-bound and role/scope based.
 */
export function canViewSegnalazione(actor: SegnalazioniActor, segnalazione: Segnalazione): boolean {
  if (!canAccessScope(actor, segnalazione.organizationalScope)) return false;

  if (hasRole(actor.role, MANAGEMENT_ROLES)) return true;
  if (hasRole(actor.role, SELF_VIEW_ROLES)) return isOwnSegnalazione(actor, segnalazione);
  if (actor.role === SegnalazioniRole.CapoImpianto) {
    return isOwnSegnalazione(actor, segnalazione) || hasPlantScope(actor, segnalazione.organizationalScope);
  }
  if (hasRole(actor.role, AREA_SCOPE_ROLES)) {
    return isOwnSegnalazione(actor, segnalazione) || isWithinAnyOrganizationalScope(segnalazione.organizationalScope, getActorScopes(actor));
  }

  return false;
}

/**
 * Commenting is allowed to owners, plant/area supervisors and management roles within scope.
 */
export function canCommentSegnalazione(actor: SegnalazioniActor, segnalazione: Segnalazione): boolean {
  if (!canViewSegnalazione(actor, segnalazione)) return false;
  return (
    isOwnSegnalazione(actor, segnalazione) ||
    actor.role === SegnalazioniRole.CapoImpianto ||
    hasRole(actor.role, AREA_SCOPE_ROLES) ||
    hasRole(actor.role, MANAGEMENT_ROLES)
  );
}

/**
 * Managing is reserved to safety/admin roles inside the tenant and company boundary.
 */
export function canManageSegnalazione(actor: SegnalazioniActor, segnalazione: Segnalazione): boolean {
  return canAccessScope(actor, segnalazione.organizationalScope) && hasRole(actor.role, MANAGEMENT_ROLES);
}

