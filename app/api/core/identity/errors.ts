export const CoreIdentityErrorCode = {
  IdentityNotFound: "IDENTITY_NOT_FOUND",
  AccountInactive: "ACCOUNT_INACTIVE",
  AccountLocked: "ACCOUNT_LOCKED",
  PersonNotLinked: "PERSON_NOT_LINKED",
  CompanyNotLinked: "COMPANY_NOT_LINKED",
  InvalidRole: "INVALID_ROLE",
  InvalidScope: "INVALID_SCOPE",
  CrossTenantScope: "CROSS_TENANT_SCOPE",
  IdentityConfigurationError: "IDENTITY_CONFIGURATION_ERROR",
} as const;

export type CoreIdentityErrorCode =
  (typeof CoreIdentityErrorCode)[keyof typeof CoreIdentityErrorCode];

export class CoreIdentityError extends Error {
  readonly code: CoreIdentityErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CoreIdentityErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CoreIdentityError";
    this.code = code;
    this.details = details;
  }
}

export function isCoreIdentityError(error: unknown): error is CoreIdentityError {
  return error instanceof CoreIdentityError;
}

