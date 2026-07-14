export const Permission = {
  DashboardView: "dashboard.view",
  SegnalazioniCreate: "segnalazioni.create",
  SegnalazioniViewOwn: "segnalazioni.view_own",
  SegnalazioniViewScope: "segnalazioni.view_scope",
  SegnalazioniManage: "segnalazioni.manage",
  SegnalazioniComment: "segnalazioni.comment",
  SegnalazioniClose: "segnalazioni.close",
  AdminIdentityView: "admin_identity.view",
  AdminIdentityManage: "admin_identity.manage",
  AdminIdentityManageOperational: "admin_identity.manage_operational",
  ComunicazioniView: "comunicazioni.view",
  ComunicazioniAcknowledge: "comunicazioni.acknowledge",
  FormazioneView: "formazione.view",
  FormazioneManage: "formazione.manage",
  DpiView: "dpi.view",
  DpiManage: "dpi.manage",
  HseOperationalView: "hse_operational.view",
  HseOperationalManage: "hse_operational.manage",
  MicroclimaView: "microclima.view",
  MicroclimaManage: "microclima.manage",
  SorveglianzaSanitariaViewOperational:
    "sorveglianza_sanitaria.view_operational",
  SorveglianzaSanitariaViewClinical: "sorveglianza_sanitaria.view_clinical",
  DocumentiView: "documenti.view",
  DocumentiManage: "documenti.manage",
  AuditView: "audit.view",
  ScadenzeView: "scadenze.view",
  ImportExportUse: "import_export.use",
  SettingsManage: "settings.manage",
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
