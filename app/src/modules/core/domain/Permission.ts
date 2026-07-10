export const Permission = {
  SegnalazioniCreate: "segnalazioni.create",
  SegnalazioniViewOwn: "segnalazioni.view_own",
  SegnalazioniViewScope: "segnalazioni.view_scope",
  SegnalazioniManage: "segnalazioni.manage",
  SegnalazioniComment: "segnalazioni.comment",
  SegnalazioniClose: "segnalazioni.close",
  ComunicazioniView: "comunicazioni.view",
  ComunicazioniAcknowledge: "comunicazioni.acknowledge",
  FormazioneView: "formazione.view",
  FormazioneManage: "formazione.manage",
  DpiView: "dpi.view",
  DpiManage: "dpi.manage",
  SorveglianzaSanitariaViewOperational:
    "sorveglianza_sanitaria.view_operational",
  SorveglianzaSanitariaViewClinical: "sorveglianza_sanitaria.view_clinical",
  DocumentiView: "documenti.view",
  DocumentiManage: "documenti.manage",
  AuditView: "audit.view",
  ScadenzeView: "scadenze.view",
  AppaltiView: "appalti.view",
  NearMissManage: "near_miss.manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const PERMISSION_VALUES = Object.values(Permission);

export function isPermission(
  value: string | null | undefined
): value is Permission {
  return PERMISSION_VALUES.includes(value as Permission);
}
