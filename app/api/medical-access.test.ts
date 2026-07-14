import { describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import {
  canAccessClinicalMedicalData,
  canAccessOperationalMedicalData,
  CLINICAL_MEDICAL_FIELDS,
  OPERATIONAL_MEDICAL_FIELDS,
} from "./medical-access";
import {
  medicalRouter,
  operationalMedicalVisitSelection,
} from "./medical-router";
import { importRouter } from "./import-router";

type Role = User["role"];

function createTestUser(role: Role): User {
  return {
    id: 1,
    unionId: `test-${role}`,
    name: `Test ${role}`,
    email: null,
    avatar: null,
    role,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
    createdBy: null,
  };
}

function createContext(role: Role) {
  return {
    req: new Request("http://localhost/api/trpc"),
    resHeaders: new Headers(),
    user: createTestUser(role),
  };
}

describe("medical RBAC policy", () => {
  it.each<Role>([
    "admin",
    "rspp",
    "aspp",
    "responsabile_sicurezza",
    "operatore_sicurezza",
    "medico_competente",
  ])("allows role %s to access operational visit data", role => {
    expect(canAccessOperationalMedicalData(role)).toBe(true);
  });

  it.each<Role>(["referente_commessa", "auditor", "sola_lettura"])(
    "denies role %s access to operational visit data",
    role => {
      expect(canAccessOperationalMedicalData(role)).toBe(false);
    }
  );

  it.each<Role>([
    "admin",
    "responsabile_sicurezza",
    "medico_competente",
  ])("allows role %s to access clinical visit data", role => {
    expect(canAccessClinicalMedicalData(role)).toBe(true);
  });

  it.each<Role>([
    "rspp",
    "aspp",
    "operatore_sicurezza",
    "referente_commessa",
    "auditor",
    "sola_lettura",
  ])("denies role %s access to clinical visit data", role => {
    expect(canAccessClinicalMedicalData(role)).toBe(false);
  });

  it("keeps every clinical field out of the operational DTO", () => {
    for (const field of CLINICAL_MEDICAL_FIELDS) {
      expect(OPERATIONAL_MEDICAL_FIELDS).not.toContain(field);
      expect(operationalMedicalVisitSelection).not.toHaveProperty(field);
    }
  });

  it("denies an operator access to the clinical list endpoint", async () => {
    const caller = medicalRouter.createCaller(
      createContext("operatore_sicurezza")
    );

    await expect(caller.clinicalList()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("denies an operator clinical updates and deletion", async () => {
    const caller = medicalRouter.createCaller(
      createContext("operatore_sicurezza")
    );

    await expect(
      caller.updateClinical({ id: 1, judgment: "idoneo" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.delete({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects clinical fields sent to the operational update endpoint", async () => {
    const caller = medicalRouter.createCaller(
      createContext("operatore_sicurezza")
    );

    await expect(
      caller.update({
        id: 1,
        judgment: "idoneo",
      } as Parameters<typeof caller.update>[0])
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("denies an operator clinical visit imports", async () => {
    const caller = importRouter.createCaller(
      createContext("operatore_sicurezza")
    );

    await expect(
      caller.importVisits({ rows: [], duplicateAction: "ignora" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies non-medical organizational roles operational visit access", async () => {
    const caller = medicalRouter.createCaller(
      createContext("referente_commessa")
    );

    await expect(caller.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
