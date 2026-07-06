import { z } from "zod";

const requiredCompanyText = (message: string) =>
  z.string().trim().min(1, message);

const optionalCompanyText = z.preprocess(
  value =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional()
);

const optionalCompanyEmail = z.preprocess(
  value =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().email("Inserire un indirizzo email valido").optional()
);

const companyFields = {
  name: requiredCompanyText("La ragione sociale è obbligatoria"),
  vatNumber: optionalCompanyText,
  fiscalCode: optionalCompanyText,
  address: requiredCompanyText("L'indirizzo è obbligatorio"),
  city: requiredCompanyText("La città è obbligatoria"),
  province: requiredCompanyText("La provincia è obbligatoria"),
  zipCode: requiredCompanyText("Il CAP è obbligatorio"),
  phone: optionalCompanyText,
  email: z
    .string()
    .trim()
    .min(1, "L'email è obbligatoria")
    .email("Inserire un indirizzo email valido"),
  isCooperative: z.boolean().default(false),
};

function requireCompanyTaxIdentifier(
  data: { vatNumber?: string; fiscalCode?: string },
  ctx: z.RefinementCtx
) {
  if (!data.vatNumber && !data.fiscalCode) {
    const message =
      "Inserire almeno uno tra Partita IVA e Codice Fiscale";
    ctx.addIssue({ code: "custom", path: ["vatNumber"], message });
    ctx.addIssue({ code: "custom", path: ["fiscalCode"], message });
  }
}

export function parseCompanyBoolean(
  value: string | boolean | null | undefined
): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return undefined;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["si", "sì", "true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0", "n"].includes(normalized)) {
    return false;
  }
  return undefined;
}

const optionalCompanyBoolean = z.preprocess(value => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (typeof value === "string" || typeof value === "boolean") {
    return parseCompanyBoolean(value) ?? value;
  }
  return value;
}, z.boolean().optional());

export const createCompanySchema = z
  .object(companyFields)
  .superRefine(requireCompanyTaxIdentifier);

export const updateCompanySchema = z
  .object({ id: z.number(), ...companyFields })
  .superRefine(requireCompanyTaxIdentifier);

export const importCompanyRowSchema = z
  .object({
    ...companyFields,
    pec: optionalCompanyEmail,
    isCooperative: optionalCompanyBoolean,
  })
  .superRefine(requireCompanyTaxIdentifier);

export type CompanyImportRow = z.infer<typeof importCompanyRowSchema>;
