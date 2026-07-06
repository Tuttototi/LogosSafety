import type { Document, User } from "@db/schema";

export type DocumentAccessDescriptor = Pick<
  Document,
  "documentType" | "entityType"
>;
export type DocumentRole = User["role"];

export const HEALTH_DOCUMENT_TYPES = [
  "giudizio_idoneita",
  "cartella_clinica",
] as const satisfies readonly Document["documentType"][];

export const IDENTITY_DOCUMENT_TYPES = [
  "documento_identita",
  "patente",
] as const satisfies readonly Document["documentType"][];

const HEALTH_DOCUMENT_ROLES = new Set<DocumentRole>([
  "admin",
  "responsabile_sicurezza",
  "medico_competente",
]);

const IDENTITY_DOCUMENT_ROLES = new Set<DocumentRole>([
  "admin",
  "responsabile_sicurezza",
]);

const GENERAL_DOCUMENT_MANAGER_ROLES = new Set<DocumentRole>([
  "admin",
  "responsabile_sicurezza",
  "operatore_sicurezza",
]);

export function isHealthDocument(
  document: DocumentAccessDescriptor
): boolean {
  return (
    document.entityType === "visita_medica" ||
    HEALTH_DOCUMENT_TYPES.includes(
      document.documentType as (typeof HEALTH_DOCUMENT_TYPES)[number]
    )
  );
}

export function isIdentityDocument(
  document: DocumentAccessDescriptor
): boolean {
  return IDENTITY_DOCUMENT_TYPES.includes(
    document.documentType as (typeof IDENTITY_DOCUMENT_TYPES)[number]
  );
}

export function canAccessDocument(
  role: DocumentRole,
  document: DocumentAccessDescriptor
): boolean {
  if (isHealthDocument(document) && !HEALTH_DOCUMENT_ROLES.has(role)) {
    return false;
  }
  if (isIdentityDocument(document) && !IDENTITY_DOCUMENT_ROLES.has(role)) {
    return false;
  }
  return true;
}

export function canManageDocument(
  role: DocumentRole,
  document: DocumentAccessDescriptor
): boolean {
  if (isHealthDocument(document)) {
    return HEALTH_DOCUMENT_ROLES.has(role);
  }
  if (isIdentityDocument(document)) {
    return IDENTITY_DOCUMENT_ROLES.has(role);
  }
  return GENERAL_DOCUMENT_MANAGER_ROLES.has(role);
}

export function getRestrictedDocumentClasses(role: DocumentRole): {
  health: boolean;
  identity: boolean;
} {
  return {
    health: !HEALTH_DOCUMENT_ROLES.has(role),
    identity: !IDENTITY_DOCUMENT_ROLES.has(role),
  };
}
