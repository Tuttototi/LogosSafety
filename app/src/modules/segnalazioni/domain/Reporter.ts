import type { DomainId } from "./Enums";
import type { CompanyId, OrganizationalScope, TenantId } from "./OrganizationalScope";

/**
 * Domain roles recognized by the Segnalazioni module.
 */
export const SegnalazioniRole = {
  Admin: "admin",
  Rspp: "rspp",
  Aspp: "aspp",
  Sicurezza: "sicurezza",
  ResponsabileSicurezza: "responsabile_sicurezza",
  OperatoreSicurezza: "operatore_sicurezza",
  CapoArea: "capo_area",
  CapoImpianto: "capo_impianto",
  ReferenteCommessa: "referente_commessa",
  Segnalatore: "segnalatore",
  Dipendente: "dipendente",
  Operatore: "operatore",
} as const;

export type SegnalazioniRole = (typeof SegnalazioniRole)[keyof typeof SegnalazioniRole];

export const SEGNALAZIONI_ROLE_VALUES = Object.values(SegnalazioniRole);

/**
 * Authenticated user who creates or acts on reports.
 * It deliberately excludes health data and other unnecessary personal information.
 */
export interface Reporter {
  userId: DomainId;
  personId: DomainId;
  employeeId?: DomainId;
  firstName: string;
  lastName: string;
  email?: string;
  tenantId: TenantId;
  companyId: CompanyId;
  role: SegnalazioniRole;
  active: boolean;
  organizationalScope: OrganizationalScope;
}

/**
 * Minimal immutable reporter snapshot stored on a report.
 * Stable references remain in createdByUserId and createdByPersonId.
 */
export interface ReporterSnapshot {
  userId: DomainId;
  personId: DomainId;
  employeeId?: DomainId;
  firstName: string;
  lastName: string;
  companyId: CompanyId;
  role: SegnalazioniRole;
  email?: string;
}

/**
 * Authenticated actor used by domain visibility rules.
 */
export interface SegnalazioniActor extends Reporter {
  assignedScopes?: OrganizationalScope[];
  canAccessAllTenants?: boolean;
}

export function isSegnalazioniRole(role: string | null | undefined): role is SegnalazioniRole {
  return SEGNALAZIONI_ROLE_VALUES.includes(role as SegnalazioniRole);
}

export function toReporterSnapshot(reporter: Reporter): ReporterSnapshot {
  return {
    userId: reporter.userId,
    personId: reporter.personId,
    employeeId: reporter.employeeId,
    firstName: reporter.firstName,
    lastName: reporter.lastName,
    companyId: reporter.companyId,
    role: reporter.role,
    email: reporter.email,
  };
}

