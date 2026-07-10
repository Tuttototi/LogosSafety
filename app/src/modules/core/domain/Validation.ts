import type { Membership } from "./Membership";
import { isMembershipType } from "./Membership";
import type { Organization } from "./Organization";
import { isOrganizationType } from "./Organization";
import type { OrganizationalScope } from "./OrganizationalScope";
import { hasAnyOrganizationalScope } from "./OrganizationalScope";
import type { Person } from "./Person";
import { isRole } from "./Role";
import type { RoleAssignment } from "./RoleAssignment";
import type { UserAccount } from "./UserAccount";
import type { DomainId, ISODateString, ISODateTimeString } from "./types";

export type DomainValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

function result(errors: string[]): DomainValidationResult {
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function isBefore(
  left: ISODateString | ISODateTimeString,
  right: ISODateString | ISODateTimeString
): boolean {
  return new Date(left).getTime() < new Date(right).getTime();
}

export function validatePerson(
  person: Partial<Person> | null | undefined
): DomainValidationResult {
  const errors: string[] = [];

  if (!person) return { valid: false, errors: ["person is required"] };
  if (isBlank(person.id)) errors.push("person.id is required");
  if (isBlank(person.tenantId)) errors.push("person.tenantId is required");
  if (isBlank(person.firstName)) errors.push("person.firstName is required");
  if (isBlank(person.lastName)) errors.push("person.lastName is required");
  if (person.active !== true) errors.push("person must be active");

  return result(errors);
}

export function validateUserAccount(
  account: Partial<UserAccount> | null | undefined,
  person?: Partial<Person> | null
): DomainValidationResult {
  const errors: string[] = [];

  if (!account) return { valid: false, errors: ["userAccount is required"] };
  if (isBlank(account.id)) errors.push("userAccount.id is required");
  if (isBlank(account.tenantId))
    errors.push("userAccount.tenantId is required");
  if (isBlank(account.personId))
    errors.push("userAccount.personId is required");
  if (isBlank(account.loginIdentifier))
    errors.push("userAccount.loginIdentifier is required");
  if (account.active !== true) errors.push("userAccount must be active");
  if (account.locked === true) errors.push("userAccount must not be locked");

  if (person) {
    if (person.id && account.personId && person.id !== account.personId) {
      errors.push("userAccount.personId must match person.id");
    }
    if (
      person.tenantId &&
      account.tenantId &&
      person.tenantId !== account.tenantId
    ) {
      errors.push("userAccount.tenantId must match person.tenantId");
    }
    if (person.active !== true)
      errors.push("person linked to userAccount must be active");
  }

  return result(errors);
}

export function validateOrganization(
  organization: Partial<Organization> | null | undefined,
  parentOrganization?: Partial<Organization> | null
): DomainValidationResult {
  const errors: string[] = [];

  if (!organization)
    return { valid: false, errors: ["organization is required"] };
  if (isBlank(organization.id)) errors.push("organization.id is required");
  if (isBlank(organization.tenantId))
    errors.push("organization.tenantId is required");
  if (!isOrganizationType(organization.type))
    errors.push("organization.type is not recognized");
  if (isBlank(organization.legalName))
    errors.push("organization.legalName is required");
  if (isBlank(organization.displayName))
    errors.push("organization.displayName is required");
  if (organization.active !== true) errors.push("organization must be active");

  if (parentOrganization) {
    if (
      organization.parentOrganizationId &&
      parentOrganization.id !== organization.parentOrganizationId
    ) {
      errors.push(
        "organization.parentOrganizationId must match parent organization"
      );
    }
    if (
      organization.tenantId &&
      parentOrganization.tenantId &&
      organization.tenantId !== parentOrganization.tenantId
    ) {
      errors.push(
        "organization and parent organization must belong to the same tenant"
      );
    }
    if (parentOrganization.active === false)
      errors.push("parent organization must be active");
  }

  return result(errors);
}

export function validateMembership(
  membership: Partial<Membership> | null | undefined,
  person?: Partial<Person> | null,
  organization?: Partial<Organization> | null
): DomainValidationResult {
  const errors: string[] = [];

  if (!membership) return { valid: false, errors: ["membership is required"] };
  if (isBlank(membership.id)) errors.push("membership.id is required");
  if (isBlank(membership.tenantId))
    errors.push("membership.tenantId is required");
  if (isBlank(membership.personId))
    errors.push("membership.personId is required");
  if (isBlank(membership.organizationId))
    errors.push("membership.organizationId is required");
  if (!isMembershipType(membership.membershipType))
    errors.push("membership.membershipType is not recognized");
  if (isBlank(membership.startDate))
    errors.push("membership.startDate is required");
  if (membership.active !== true) errors.push("membership must be active");
  if (
    membership.startDate &&
    membership.endDate &&
    isBefore(membership.endDate, membership.startDate)
  ) {
    errors.push("membership.endDate must be after startDate");
  }

  if (person) {
    if (person.id && membership.personId && person.id !== membership.personId) {
      errors.push("membership.personId must match person.id");
    }
    if (
      person.tenantId &&
      membership.tenantId &&
      person.tenantId !== membership.tenantId
    ) {
      errors.push("membership.tenantId must match person.tenantId");
    }
    if (person.active !== true)
      errors.push("person linked to membership must be active");
  }

  if (organization) {
    if (
      organization.id &&
      membership.organizationId &&
      organization.id !== membership.organizationId
    ) {
      errors.push("membership.organizationId must match organization.id");
    }
    if (
      organization.tenantId &&
      membership.tenantId &&
      organization.tenantId !== membership.tenantId
    ) {
      errors.push("membership.tenantId must match organization.tenantId");
    }
    if (organization.active !== true)
      errors.push("organization linked to membership must be active");
  }

  return result(errors);
}

export function validateOrganizationalScope(
  scope: Partial<OrganizationalScope> | null | undefined,
  expectedTenantId?: DomainId
): DomainValidationResult {
  const errors: string[] = [];

  if (!scope)
    return { valid: false, errors: ["organizationalScope is required"] };
  if (isBlank(scope.tenantId))
    errors.push("organizationalScope.tenantId is required");
  if (
    expectedTenantId &&
    scope.tenantId &&
    scope.tenantId !== expectedTenantId
  ) {
    errors.push("organizationalScope.tenantId must match expected tenant");
  }

  const completeScope: OrganizationalScope = {
    tenantId: scope.tenantId ?? "",
    organizationIds: scope.organizationIds ?? [],
    siteIds: scope.siteIds ?? [],
    contractIds: scope.contractIds ?? [],
    plantIds: scope.plantIds ?? [],
    areaIds: scope.areaIds ?? [],
    allOrganizations: scope.allOrganizations === true,
    allSites: scope.allSites === true,
    allContracts: scope.allContracts === true,
    allPlants: scope.allPlants === true,
    allAreas: scope.allAreas === true,
  };

  if (!hasAnyOrganizationalScope(completeScope)) {
    errors.push(
      "organizationalScope must include at least one scoped boundary"
    );
  }

  return result(errors);
}

export function validateRoleAssignment(
  assignment: Partial<RoleAssignment> | null | undefined,
  now: ISODateTimeString = new Date().toISOString()
): DomainValidationResult {
  const errors: string[] = [];

  if (!assignment)
    return { valid: false, errors: ["roleAssignment is required"] };
  if (isBlank(assignment.id)) errors.push("roleAssignment.id is required");
  if (isBlank(assignment.tenantId))
    errors.push("roleAssignment.tenantId is required");
  if (isBlank(assignment.personId) && isBlank(assignment.userId)) {
    errors.push("roleAssignment requires personId or userId");
  }
  if (!isRole(assignment.role))
    errors.push("roleAssignment.role is not recognized");
  if (assignment.active !== true) errors.push("roleAssignment must be active");
  if (isBlank(assignment.validFrom))
    errors.push("roleAssignment.validFrom is required");
  if (assignment.validTo && isBefore(assignment.validTo, now)) {
    errors.push("roleAssignment must not be expired");
  }

  const scopeResult = validateOrganizationalScope(
    assignment.organizationalScope,
    assignment.tenantId
  );
  if (!scopeResult.valid) {
    errors.push(...scopeResult.errors);
  }

  return result(errors);
}
