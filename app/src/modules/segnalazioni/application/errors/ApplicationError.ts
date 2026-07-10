export const ApplicationErrorCode = {
  ValidationError: "VALIDATION_ERROR",
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  InvalidTransition: "INVALID_TRANSITION",
  CrossTenantAccess: "CROSS_TENANT_ACCESS",
  InactiveUser: "INACTIVE_USER",
  Conflict: "CONFLICT",
  InternalError: "INTERNAL_ERROR",
} as const;

export type ApplicationErrorCode = (typeof ApplicationErrorCode)[keyof typeof ApplicationErrorCode];

export interface ApplicationError {
  code: ApplicationErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ApplicationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApplicationError };

export function ok<T>(data: T): ApplicationResult<T> {
  return { success: true, data };
}

export function fail<T = never>(
  code: ApplicationErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApplicationResult<T> {
  return { success: false, error: { code, message, details } };
}

