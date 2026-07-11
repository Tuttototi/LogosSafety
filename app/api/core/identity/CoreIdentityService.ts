import type { User } from "@db/schema";
import {
  MembershipType,
  OrganizationType,
  Permission,
  Role,
  createEmptyOrganizationalScope,
  isRole,
  type Membership,
  type Organization,
  type OrganizationalScope,
  type Person,
  type RoleAssignment,
  type UserAccount,
} from "@/modules/core/domain";
import type { ActorContext } from "@/modules/shared/contracts";
import { DrizzleCoreIdentityRepository } from "./DrizzleCoreIdentityRepository";
import type { CoreIdentityRepository } from "./CoreIdentityRepository";
import { CoreIdentityError, CoreIdentityErrorCode, isCoreIdentityError } from "./errors";
import type {
  IdentityCompanyRecord,
  IdentityPersonRecord,
  IdentityScopeRecord,
  IdentityUserRecord,
  LegacyUserRole,
} from "./types";

const COMPANY_SCOPE_ROLES = new Set<Role>([
  Role.Admin,
  Role.ResponsabileSicurezza,
]);

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.Admin]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniManage,
    Permission.SegnalazioniComment,
    Permission.SegnalazioniClose,
    Permission.AuditView,
  ],
  [Role.Rspp]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniManage,
    Permission.SegnalazioniComment,
    Permission.SegnalazioniClose,
  ],
  [Role.Aspp]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniManage,
    Permission.SegnalazioniComment,
  ],
  [Role.ResponsabileSicurezza]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniManage,
    Permission.SegnalazioniComment,
    Permission.SegnalazioniClose,
  ],
  [Role.OperatoreSicurezza]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniComment,
  ],
  [Role.CapoArea]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniComment,
  ],
  [Role.CapoImpianto]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniComment,
  ],
  [Role.ReferenteCommessa]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewScope,
    Permission.SegnalazioniComment,
    Permission.AppaltiView,
  ],
  [Role.Segnalatore]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewOwn,
    Permission.SegnalazioniComment,
  ],
  [Role.Dipendente]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewOwn,
    Permission.SegnalazioniComment,
  ],
  [Role.Operatore]: [
    Permission.SegnalazioniCreate,
    Permission.SegnalazioniViewOwn,
    Permission.SegnalazioniComment,
  ],
  [Role.MedicoCompetente]: [
    Permission.SorveglianzaSanitariaViewOperational,
    Permission.SorveglianzaSanitariaViewClinical,
  ],
  [Role.Auditor]: [
    Permission.AuditView,
    Permission.SegnalazioniViewScope,
  ],
  [Role.SolaLettura]: [
    Permission.SegnalazioniViewScope,
  ],
};

function domainId(value: number | string): string {
  return String(value);
}

function mapLegacyRole(role: LegacyUserRole | string): Role {
  if (!isRole(role)) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.InvalidRole,
      "Authenticated user has an unsupported role",
    );
  }

  return role;
}

function assertActivePerson(person: IdentityPersonRecord): void {
  if (!person.active || person.deletedAt || person.status !== "attivo") {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.PersonNotLinked,
      "Authenticated user is not linked to an active worker/person",
    );
  }
}

function toCompanyTenantId(company: Pick<IdentityCompanyRecord, "id">): string {
  return domainId(company.id);
}

function toPerson(person: IdentityPersonRecord, tenantId: string): Person {
  return {
    id: domainId(person.id),
    tenantId,
    firstName: person.firstName,
    lastName: person.lastName,
    taxCode: person.fiscalCode ?? undefined,
    email: person.email ?? undefined,
    phone: person.phone ?? undefined,
    active: person.active && !person.deletedAt && person.status === "attivo",
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}

function toUserAccount(user: IdentityUserRecord, person: Person): UserAccount {
  return {
    id: domainId(user.id),
    tenantId: person.tenantId,
    personId: person.id,
    loginIdentifier: user.email ?? user.unionId,
    active: user.active,
    locked: false,
    lastLoginAt: user.lastSignInAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toOrganization(company: IdentityCompanyRecord, tenantId: string): Organization {
  return {
    id: domainId(company.id),
    tenantId,
    type: company.isCooperative ? OrganizationType.Cooperative : OrganizationType.ManagedOrganization,
    legalName: company.name,
    displayName: company.name,
    taxCode: company.fiscalCode ?? undefined,
    vatNumber: company.vatNumber ?? undefined,
    active: company.active,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

function toMembership(person: Person, organization: Organization): Membership {
  return {
    id: `${person.id}:${organization.id}`,
    tenantId: person.tenantId,
    personId: person.id,
    organizationId: organization.id,
    membershipType: MembershipType.Employee,
    active: person.active && organization.active,
    startDate: person.createdAt.slice(0, 10),
  };
}

function makeCompanyScope(tenantId: string, companyId: string): OrganizationalScope {
  return {
    ...createEmptyOrganizationalScope(tenantId),
    organizationIds: [companyId],
    allSites: true,
    allContracts: true,
  };
}

function makeLimitedScope(
  tenantId: string,
  companyId: string,
  siteId?: number | null,
  contractId?: number | null,
): OrganizationalScope {
  return {
    ...createEmptyOrganizationalScope(tenantId),
    organizationIds: [companyId],
    siteIds: siteId ? [domainId(siteId)] : [],
    contractIds: contractId ? [domainId(contractId)] : [],
    allContracts: Boolean(siteId && !contractId),
  };
}

function mergeScopes(tenantId: string, scopes: OrganizationalScope[]): OrganizationalScope {
  const merged = createEmptyOrganizationalScope(tenantId);
  for (const scope of scopes) {
    if (scope.tenantId !== tenantId) {
      throw new CoreIdentityError(
        CoreIdentityErrorCode.CrossTenantScope,
        "Identity scope belongs to another tenant",
      );
    }

    merged.organizationIds.push(...scope.organizationIds);
    merged.siteIds.push(...scope.siteIds);
    merged.contractIds.push(...scope.contractIds);
    merged.plantIds.push(...scope.plantIds);
    merged.areaIds.push(...scope.areaIds);
    merged.allOrganizations ||= scope.allOrganizations;
    merged.allSites ||= scope.allSites;
    merged.allContracts ||= scope.allContracts;
    merged.allPlants ||= scope.allPlants;
    merged.allAreas ||= scope.allAreas;
  }

  return {
    ...merged,
    organizationIds: [...new Set(merged.organizationIds)],
    siteIds: [...new Set(merged.siteIds)],
    contractIds: [...new Set(merged.contractIds)],
    plantIds: [...new Set(merged.plantIds)],
    areaIds: [...new Set(merged.areaIds)],
  };
}

function validateScope(
  scope: IdentityScopeRecord,
  company: IdentityCompanyRecord,
  seen: Set<string>,
): void {
  if (scope.companyId !== company.id) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.CrossTenantScope,
      "Identity scope belongs to another company boundary",
    );
  }

  if (scope.siteId && scope.siteCompanyId !== company.id) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.CrossTenantScope,
      "Identity site scope belongs to another company boundary",
    );
  }

  if (scope.contractId && scope.contractSiteId && scope.siteId && scope.contractSiteId !== scope.siteId) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.InvalidScope,
      "Identity contract scope is incoherent with site scope",
    );
  }

  const key = `${scope.companyId}:${scope.siteId ?? "*"}:${scope.contractId ?? "*"}`;
  if (seen.has(key)) {
    throw new CoreIdentityError(
      CoreIdentityErrorCode.InvalidScope,
      "Identity scope contains duplicate assignments",
    );
  }
  seen.add(key);
}

function explicitScopesToDomain(
  scopeRows: IdentityScopeRecord[],
  company: IdentityCompanyRecord,
  tenantId: string,
): OrganizationalScope[] {
  const seen = new Set<string>();
  return scopeRows.map((scope) => {
    validateScope(scope, company, seen);
    return makeLimitedScope(tenantId, domainId(company.id), scope.siteId, scope.contractId);
  });
}

function deriveFallbackScopes(
  role: Role,
  person: IdentityPersonRecord,
  company: IdentityCompanyRecord,
  tenantId: string,
): OrganizationalScope[] {
  if (COMPANY_SCOPE_ROLES.has(role)) {
    return [makeCompanyScope(tenantId, domainId(company.id))];
  }

  return [
    makeLimitedScope(
      tenantId,
      domainId(company.id),
      person.siteId,
      person.contractId,
    ),
  ];
}

function makeRoleAssignment(
  user: IdentityUserRecord,
  person: Person,
  role: Role,
  organizationalScope: OrganizationalScope,
): RoleAssignment {
  return {
    id: `${user.id}:${person.id}:${role}`,
    tenantId: person.tenantId,
    personId: person.id,
    userId: domainId(user.id),
    role,
    organizationalScope,
    validFrom: user.createdAt.toISOString(),
    active: user.active && person.active,
  };
}

export class CoreIdentityService {
  private readonly repository: CoreIdentityRepository;

  constructor(repository: CoreIdentityRepository = new DrizzleCoreIdentityRepository()) {
    this.repository = repository;
  }

  async resolveActorContext(authenticatedUser: User | undefined): Promise<ActorContext> {
    try {
      if (!authenticatedUser) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.IdentityNotFound,
          "Authenticated user is required",
        );
      }

      const user = await this.repository.findUserById(authenticatedUser.id);
      if (!user) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.IdentityNotFound,
          "Authenticated user account was not found",
        );
      }

      if (!user.active) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.AccountInactive,
          "Authenticated user account is inactive",
        );
      }

      const role = mapLegacyRole(user.role);
      const people = await this.repository.findPeopleByUser(user);
      if (people.length === 0) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.PersonNotLinked,
          "Authenticated user is not linked to a worker/person",
        );
      }
      if (people.length > 1) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.IdentityConfigurationError,
          "Authenticated user is linked to multiple workers/persons",
        );
      }

      const workerPerson = people[0];
      assertActivePerson(workerPerson);

      const company = await this.repository.findCompanyById(workerPerson.companyId);
      if (!company || !company.active) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.CompanyNotLinked,
          "Authenticated user is not linked to an active company",
        );
      }

      const tenantId = toCompanyTenantId(company);
      const person = toPerson(workerPerson, tenantId);
      const userAccount = toUserAccount(user, person);
      if (userAccount.locked) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.AccountLocked,
          "Authenticated user account is locked",
        );
      }

      const organization = toOrganization(company, tenantId);
      const membership = toMembership(person, organization);
      if (!membership.active) {
        throw new CoreIdentityError(
          CoreIdentityErrorCode.CompanyNotLinked,
          "Authenticated user membership is inactive",
        );
      }

      const explicitScopes = await this.repository.listScopesByUserId(user.id);
      const scopes = explicitScopes.length > 0
        ? explicitScopesToDomain(explicitScopes, company, tenantId)
        : deriveFallbackScopes(role, workerPerson, company, tenantId);
      const organizationalScope = mergeScopes(tenantId, scopes);
      const roleAssignment = makeRoleAssignment(user, person, role, organizationalScope);

      return {
        tenantId,
        companyId: organization.id,
        personId: person.id,
        userId: userAccount.id,
        role: roleAssignment.role,
        roles: [roleAssignment.role],
        active: userAccount.active && person.active && membership.active && roleAssignment.active,
        organizationalScope,
        scopes,
        permissions: ROLE_PERMISSIONS[role],
        canAccessAllTenants: false,
        displayName: `${person.firstName} ${person.lastName}`.trim(),
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email ?? user.email ?? undefined,
      };
    } catch (error) {
      if (isCoreIdentityError(error)) throw error;

      throw new CoreIdentityError(
        CoreIdentityErrorCode.IdentityConfigurationError,
        "Identity configuration error",
      );
    }
  }
}

export function createCoreIdentityService(
  repository?: CoreIdentityRepository,
): CoreIdentityService {
  return new CoreIdentityService(repository);
}

