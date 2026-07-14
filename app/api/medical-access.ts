import type { MedicalVisit, User } from "@db/schema";

export type MedicalRole = User["role"];

export const OPERATIONAL_MEDICAL_ROLES = [
  "admin",
  "rspp",
  "aspp",
  "responsabile_sicurezza",
  "operatore_sicurezza",
  "medico_competente",
] as const satisfies readonly MedicalRole[];

export const CLINICAL_MEDICAL_ROLES = [
  "admin",
  "responsabile_sicurezza",
  "medico_competente",
] as const satisfies readonly MedicalRole[];

export const CLINICAL_MEDICAL_FIELDS = [
  "doctorName",
  "doctorId",
  "healthProtocol",
  "judgment",
  "limitationDescription",
  "prescriptionDescription",
  "attachmentUrl",
  "notes",
] as const satisfies readonly (keyof MedicalVisit)[];

export const OPERATIONAL_MEDICAL_FIELDS = [
  "id",
  "workerId",
  "visitType",
  "requestDate",
  "scheduledDate",
  "visitDate",
  "nextVisitDue",
  "requestStatus",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof MedicalVisit)[];

export function canAccessOperationalMedicalData(role: MedicalRole): boolean {
  return OPERATIONAL_MEDICAL_ROLES.includes(
    role as (typeof OPERATIONAL_MEDICAL_ROLES)[number]
  );
}

export function canAccessClinicalMedicalData(role: MedicalRole): boolean {
  return CLINICAL_MEDICAL_ROLES.includes(
    role as (typeof CLINICAL_MEDICAL_ROLES)[number]
  );
}
