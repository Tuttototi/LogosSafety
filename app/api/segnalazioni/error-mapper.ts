import { TRPCError } from "@trpc/server";
import {
  ApplicationErrorCode,
  type ApplicationError,
  type ApplicationResult,
} from "@/modules/segnalazioni/application";
import { SegnalazioniPersistenceError } from "@/modules/segnalazioni/infrastructure/persistence";
import { CoreIdentityError, CoreIdentityErrorCode } from "../core/identity";

function codeForApplicationError(code: ApplicationError["code"]): TRPCError["code"] {
  switch (code) {
    case ApplicationErrorCode.ValidationError:
      return "BAD_REQUEST";
    case ApplicationErrorCode.Unauthorized:
      return "UNAUTHORIZED";
    case ApplicationErrorCode.Forbidden:
      return "FORBIDDEN";
    case ApplicationErrorCode.NotFound:
      return "NOT_FOUND";
    case ApplicationErrorCode.InvalidTransition:
      return "BAD_REQUEST";
    case ApplicationErrorCode.CrossTenantAccess:
      return "FORBIDDEN";
    case ApplicationErrorCode.InactiveUser:
      return "FORBIDDEN";
    case ApplicationErrorCode.Conflict:
      return "CONFLICT";
    case ApplicationErrorCode.InternalError:
      return "INTERNAL_SERVER_ERROR";
  }
}

export function throwApplicationError(error: ApplicationError): never {
  throw new TRPCError({
    code: codeForApplicationError(error.code),
    message: error.message,
    cause: error.details,
  });
}

export function unwrapResult<T>(result: ApplicationResult<T>): T {
  if (!result.success) {
    throwApplicationError(result.error);
  }

  return result.data;
}

export function mapUnexpectedSegnalazioniError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof CoreIdentityError) {
    switch (error.code) {
      case CoreIdentityErrorCode.IdentityNotFound:
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authenticated identity is required" });
      case CoreIdentityErrorCode.AccountInactive:
      case CoreIdentityErrorCode.AccountLocked:
      case CoreIdentityErrorCode.PersonNotLinked:
      case CoreIdentityErrorCode.CompanyNotLinked:
      case CoreIdentityErrorCode.InvalidRole:
      case CoreIdentityErrorCode.InvalidScope:
      case CoreIdentityErrorCode.CrossTenantScope:
        throw new TRPCError({ code: "FORBIDDEN", message: error.message });
      case CoreIdentityErrorCode.IdentityConfigurationError:
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Identity configuration error" });
    }
  }

  if (error instanceof SegnalazioniPersistenceError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Segnalazioni persistence operation failed",
    });
  }

  if (error instanceof Error && /duplicate|unique|conflict/i.test(error.message)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Segnalazione already exists for the current tenant",
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Segnalazioni operation failed",
  });
}
