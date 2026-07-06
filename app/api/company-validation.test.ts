import { describe, expect, it } from "vitest";
import { importCompanyRowSchema } from "./company-validation";
import {
  FIELD_DEFS,
  getImportRowValidator,
  validateRows,
} from "@/lib/excel/import";

const validCompany = {
  name: "Edilizia Nord Srl",
  vatNumber: "12345678901",
  address: "Via Roma 123",
  city: "Milano",
  province: "MI",
  zipCode: "20121",
  email: "info@edilizianord.it",
};

describe("company import validation", () => {
  it("accepts a valid company row and parses cooperative text", () => {
    const parsed = importCompanyRowSchema.safeParse({
      ...validCompany,
      pec: "edilizianord@pec.it",
      isCooperative: "NO",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isCooperative).toBe(false);
      expect(parsed.data.pec).toBe("edilizianord@pec.it");
    }
  });

  it("requires the same mandatory fields used by the company form", () => {
    const parsed = importCompanyRowSchema.safeParse({
      name: "Senza Dati Srl",
      vatNumber: "12345678901",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map(issue => issue.path.join("."));
      expect(paths).toEqual(
        expect.arrayContaining(["address", "city", "province", "zipCode", "email"])
      );
    }
  });

  it("requires at least VAT number or fiscal code", () => {
    const parsed = importCompanyRowSchema.safeParse({
      ...validCompany,
      vatNumber: "",
      fiscalCode: "",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map(issue => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["vatNumber", "fiscalCode"]));
    }
  });

  it("reports the cross-field tax identifier error in Excel preview", () => {
    const validated = validateRows(
      [
        {
          nome: "Senza Identificativo Srl",
          indirizzo: "Via Roma 123",
          citta: "Milano",
          provincia: "MI",
          cap: "20121",
          email: "info@example.it",
        },
      ],
      FIELD_DEFS.aziende,
      undefined,
      getImportRowValidator("aziende")
    );

    expect(validated[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: "Partita IVA / Codice Fiscale",
          severity: "error",
        }),
      ])
    );
  });

  it("rejects invalid cooperative values in Excel preview", () => {
    const validated = validateRows(
      [
        {
          nome: "Coop Test",
          partitaiva: "12345678901",
          indirizzo: "Via Roma 123",
          citta: "Milano",
          provincia: "MI",
          cap: "20121",
          email: "info@example.it",
          cooperativa: "forse",
        },
      ],
      FIELD_DEFS.aziende,
      undefined,
      getImportRowValidator("aziende")
    );

    expect(validated[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: "Cooperativa",
          message: "Valore booleano non valido. Usa SI/NO",
        }),
      ])
    );
  });
});
