import { CoreIdentityError, CoreIdentityErrorCode } from "./errors";
import { Role, type OrganizationalScope as CoreOrganizationalScope } from "@/modules/core/domain";
import type { ActorContext } from "@/modules/shared/contracts";
import {
  SegnalazioniRole,
  type OrganizationalScope as SegnalazioniScope,
} from "@/modules/segnalazioni/domain";
import type { ApplicationActor } from "@/modules/segnalazioni/application";

function mapRole(role: Role): SegnalazioniRole {
  switch (role) {
    case Role.Admin:
      return SegnalazioniRole.Admin;
    case Role.Rspp:
      return SegnalazioniRole.Rspp;
    case Role.Aspp:
      return SegnalazioniRole.Aspp;
    case Role.ResponsabileSicurezza:
      return SegnalazioniRole.ResponsabileSicurezza;
    case Role.OperatoreSicurezza:
      return SegnalazioniRole.OperatoreSicurezza;
    case Role.CapoArea:
      return SegnalazioniRole.CapoArea;
    case Role.CapoImpianto:
      return SegnalazioniRole.CapoImpianto;
    case Role.ReferenteCommessa:
      return SegnalazioniRole.ReferenteCommessa;
    case Role.Segnalatore:
      return SegnalazioniRole.Segnalatore;
    case Role.Dipendente:
      return SegnalazioniRole.Dipendente;
    case Role.Operatore:
    case Role.MedicoCompetente:
    case Role.Auditor:
      return SegnalazioniRole.Operatore;
    case Role.SolaLettura:
      return SegnalazioniRole.Dipendente;
  }
}

function toSegnalazioniScope(
  tenantId: string,
  companyId: string,
  scope: CoreOrganizationalScope,
): SegnalazioniScope {
  return {
    tenantId,
    companyId,
    contractId: scope.contractIds.at(0),
    siteId: scope.siteIds.at(0),
    plantId: scope.plantIds.at(0),
    areaId: scope.areaIds.at(0),
  };
}

export function toSegnalazioniActor(actor: ActorContext): ApplicationActor {
  if (!actor.userId || !actor.personId) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.PersonNotLinked,
      "Actor context is missing user or person identity",
    );
  }

  if (!actor.companyId) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.CompanyNotLinked,
      "Actor context is missing company identity",
    );
  }

  const assignedScopes = actor.scopes.map((scope) =>
    toSegnalazioniScope(actor.tenantId, actor.companyId, scope)
  );

  return {
    userId: actor.userId,
    personId: actor.personId,
    firstName: actor.firstName ?? actor.displayName ?? "Utente",
    lastName: actor.lastName ?? "LogosSafety",
    email: actor.email,
    tenantId: actor.tenantId,
    companyId: actor.companyId,
    role: mapRole(actor.role),
    active: actor.active,
    organizationalScope: assignedScopes.at(0) ?? {
      tenantId: actor.tenantId,
      companyId: actor.companyId,
    },
    assignedScopes,
    canAccessAllTenants: actor.canAccessAllTenants,
  };
}

