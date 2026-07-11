import type { User } from "@db/schema";
import {
  SegnalazioniRole,
  type OrganizationalScope,
} from "@/modules/segnalazioni/domain";
import type { ApplicationActor } from "@/modules/segnalazioni/application";

const DEFAULT_TENANT_ID = "logos-safety-local";
const DEFAULT_COMPANY_ID = "logos-safety-company-local";

function normalizeName(name: string | null): { firstName: string; lastName: string } {
  const fallback = "Utente LogosSafety";
  const parts = (name?.trim() || fallback).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Utente", lastName: "LogosSafety" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "LogosSafety" };

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "LogosSafety",
  };
}

function mapRole(role: User["role"]): SegnalazioniRole {
  switch (role) {
    case "admin":
      return SegnalazioniRole.Admin;
    case "responsabile_sicurezza":
      return SegnalazioniRole.ResponsabileSicurezza;
    case "operatore_sicurezza":
      return SegnalazioniRole.OperatoreSicurezza;
    case "referente_commessa":
      return SegnalazioniRole.ReferenteCommessa;
    case "medico_competente":
      return SegnalazioniRole.Operatore;
    case "auditor":
      return SegnalazioniRole.Operatore;
    case "sola_lettura":
      return SegnalazioniRole.Dipendente;
  }
}

export function getLegacySegnalazioniScope(): OrganizationalScope {
  return {
    tenantId: process.env.SEGNALAZIONI_TENANT_ID?.trim() || DEFAULT_TENANT_ID,
    companyId: process.env.SEGNALAZIONI_COMPANY_ID?.trim() || DEFAULT_COMPANY_ID,
  };
}

export function buildSegnalazioniActor(user: User): ApplicationActor {
  const { firstName, lastName } = normalizeName(user.name);
  const scope = getLegacySegnalazioniScope();
  const userId = `legacy-user-${user.id}`;
  const personId = `legacy-person-${user.id}`;

  return {
    userId,
    personId,
    firstName,
    lastName,
    email: user.email ?? undefined,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    role: mapRole(user.role),
    active: user.active,
    organizationalScope: scope,
    assignedScopes: [scope],
    canAccessAllTenants: false,
  };
}

