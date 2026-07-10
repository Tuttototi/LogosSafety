export const Role = {
  Admin: "admin",
  Rspp: "rspp",
  Aspp: "aspp",
  ResponsabileSicurezza: "responsabile_sicurezza",
  OperatoreSicurezza: "operatore_sicurezza",
  CapoArea: "capo_area",
  CapoImpianto: "capo_impianto",
  ReferenteCommessa: "referente_commessa",
  Segnalatore: "segnalatore",
  Dipendente: "dipendente",
  Operatore: "operatore",
  MedicoCompetente: "medico_competente",
  Auditor: "auditor",
  SolaLettura: "sola_lettura",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_VALUES = Object.values(Role);

export function isRole(value: string | null | undefined): value is Role {
  return ROLE_VALUES.includes(value as Role);
}
