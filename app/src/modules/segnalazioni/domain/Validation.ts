import type { SegnalazioneInput } from "./Segnalazione";
import { isSegnalazioniRole } from "./Reporter";
import type { Reporter } from "./Reporter";
import type { OrganizationalScope } from "./OrganizationalScope";

export type DomainValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

function validationResult(errors: string[]): DomainValidationResult {
  return errors.length ? { valid: false, errors } : { valid: true };
}

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

/**
 * Validates the mandatory tenant and company scope for a report.
 */
export function validateOrganizationalScope(
  scope: Partial<OrganizationalScope> | null | undefined,
): DomainValidationResult {
  const errors: string[] = [];

  if (!scope) {
    return { valid: false, errors: ["organizationalScope is required"] };
  }

  if (isBlank(scope.tenantId)) errors.push("tenantId is required");
  if (isBlank(scope.companyId)) errors.push("companyId is required");

  return validationResult(errors);
}

/**
 * Validates that the report author is a known, active and traceable LogosSafety user.
 */
export function validateReporter(reporter: Partial<Reporter> | null | undefined): DomainValidationResult {
  const errors: string[] = [];

  if (!reporter) {
    return { valid: false, errors: ["reporter is required"] };
  }

  if (isBlank(reporter.userId)) errors.push("reporter.userId is required");
  if (isBlank(reporter.personId)) errors.push("reporter.personId is required");
  if (isBlank(reporter.firstName)) errors.push("reporter.firstName is required");
  if (isBlank(reporter.lastName)) errors.push("reporter.lastName is required");
  if (isBlank(reporter.tenantId)) errors.push("reporter.tenantId is required");
  if (isBlank(reporter.companyId)) errors.push("reporter.companyId is required");
  if (reporter.active !== true) errors.push("reporter must be active");
  if (!isSegnalazioniRole(reporter.role)) errors.push("reporter.role is not recognized");

  const scopeResult = validateOrganizationalScope(reporter.organizationalScope);
  if (!scopeResult.valid) {
    errors.push(...scopeResult.errors.map((error) => `reporter.${error}`));
  } else if (reporter.organizationalScope) {
    if (reporter.tenantId && reporter.organizationalScope.tenantId !== reporter.tenantId) {
      errors.push("reporter.organizationalScope.tenantId must match reporter.tenantId");
    }
    if (reporter.companyId && reporter.organizationalScope.companyId !== reporter.companyId) {
      errors.push("reporter.organizationalScope.companyId must match reporter.companyId");
    }
  }

  return validationResult(errors);
}

/**
 * Validates the minimum data required to submit a report.
 */
export function canSubmitSegnalazione(
  input: Partial<SegnalazioneInput> | null | undefined,
): DomainValidationResult {
  const errors: string[] = [];

  if (!input) {
    return { valid: false, errors: ["segnalazione input is required"] };
  }

  if (isBlank(input.tenantId)) errors.push("tenantId is required");
  if (isBlank(input.companyId)) errors.push("companyId is required");
  if (isBlank(input.title)) errors.push("title is required");
  if (isBlank(input.description)) errors.push("description is required");

  const scopeResult = validateOrganizationalScope(input.organizationalScope);
  if (!scopeResult.valid) errors.push(...scopeResult.errors);

  const reporterResult = validateReporter(input.reporter);
  if (!reporterResult.valid) errors.push(...reporterResult.errors);

  if (input.organizationalScope) {
    if (input.tenantId && input.organizationalScope.tenantId !== input.tenantId) {
      errors.push("organizationalScope.tenantId must match tenantId");
    }
    if (input.companyId && input.organizationalScope.companyId !== input.companyId) {
      errors.push("organizationalScope.companyId must match companyId");
    }
  }

  if (input.reporter) {
    if (input.tenantId && input.reporter.tenantId !== input.tenantId) {
      errors.push("reporter.tenantId must match tenantId");
    }
    if (input.companyId && input.reporter.companyId !== input.companyId) {
      errors.push("reporter.companyId must match companyId");
    }
  }

  return validationResult(errors);
}

