import { describe, expect, it } from "vitest";
import type { Document, User } from "@db/schema";
import {
  canAccessDocument,
  canManageDocument,
  getRestrictedDocumentClasses,
} from "./document-access";

type Role = User["role"];
type Descriptor = Pick<Document, "documentType" | "entityType">;

const ordinaryDocument: Descriptor = {
  documentType: "attestato",
  entityType: "attestato",
};
const healthDocument: Descriptor = {
  documentType: "cartella_clinica",
  entityType: "dipendente",
};
const medicalEntityDocument: Descriptor = {
  documentType: "altro",
  entityType: "visita_medica",
};
const identityDocument: Descriptor = {
  documentType: "documento_identita",
  entityType: "dipendente",
};

describe("document access policy", () => {
  it.each<Role>([
    "admin",
    "responsabile_sicurezza",
    "operatore_sicurezza",
    "medico_competente",
    "referente_commessa",
    "auditor",
    "sola_lettura",
  ])("allows authenticated role %s to read ordinary document metadata", role => {
    expect(canAccessDocument(role, ordinaryDocument)).toBe(true);
  });

  it.each<Role>(["admin", "responsabile_sicurezza", "medico_competente"])(
    "allows authorized role %s to access health documents",
    role => {
      expect(canAccessDocument(role, healthDocument)).toBe(true);
      expect(canAccessDocument(role, medicalEntityDocument)).toBe(true);
    }
  );

  it.each<Role>([
    "operatore_sicurezza",
    "referente_commessa",
    "auditor",
    "sola_lettura",
  ])("denies role %s access to health documents", role => {
    expect(canAccessDocument(role, healthDocument)).toBe(false);
    expect(canAccessDocument(role, medicalEntityDocument)).toBe(false);
  });

  it.each<Role>(["admin", "responsabile_sicurezza"])(
    "allows authorized role %s to access identity documents",
    role => {
      expect(canAccessDocument(role, identityDocument)).toBe(true);
    }
  );

  it.each<Role>([
    "operatore_sicurezza",
    "medico_competente",
    "referente_commessa",
    "auditor",
    "sola_lettura",
  ])("denies role %s access to identity documents", role => {
    expect(canAccessDocument(role, identityDocument)).toBe(false);
  });

  it("allows only explicit manager roles to write each document class", () => {
    expect(canManageDocument("operatore_sicurezza", ordinaryDocument)).toBe(
      true
    );
    expect(canManageDocument("operatore_sicurezza", healthDocument)).toBe(
      false
    );
    expect(canManageDocument("medico_competente", healthDocument)).toBe(true);
    expect(canManageDocument("medico_competente", ordinaryDocument)).toBe(
      false
    );
    expect(canManageDocument("responsabile_sicurezza", identityDocument)).toBe(
      true
    );
    expect(canManageDocument("medico_competente", identityDocument)).toBe(
      false
    );
  });

  it("returns the classes that must be filtered from list queries", () => {
    expect(getRestrictedDocumentClasses("sola_lettura")).toEqual({
      health: true,
      identity: true,
    });
    expect(getRestrictedDocumentClasses("medico_competente")).toEqual({
      health: false,
      identity: true,
    });
    expect(getRestrictedDocumentClasses("admin")).toEqual({
      health: false,
      identity: false,
    });
  });
});
