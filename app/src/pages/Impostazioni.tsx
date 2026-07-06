import { useState } from "react";
import {
  Building2,
  GraduationCap,
  AlertTriangle,
  MapPin,
  Briefcase,
  Plus,
  Palette,
  Pencil,
  Trash2,
  FileDown,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/providers/trpc";
import { getRiskLevelColor } from "@/lib/status-utils";
import { exportTableToExcel, downloadExcel } from "@/lib/excel/import";
import BrandingPanel from "@/components/settings/BrandingPanel";
import { toast } from "sonner";

type TabKey = "aziende" | "mansioni" | "rischi" | "formazione" | "branding";

interface CompanyFormData {
  id?: number;
  name: string;
  vatNumber: string;
  fiscalCode: string;
  address: string;
  city: string;
  province: string;
  zipCode: string;
  phone: string;
  email: string;
  isCooperative: boolean;
}

type CompanyFormField =
  | "name"
  | "vatNumber"
  | "fiscalCode"
  | "address"
  | "city"
  | "province"
  | "zipCode"
  | "phone"
  | "email";

type CompanyFormErrors = Partial<Record<CompanyFormField, string>>;

const emptyCompany: CompanyFormData = {
  name: "",
  vatNumber: "",
  fiscalCode: "",
  address: "",
  city: "",
  province: "",
  zipCode: "",
  phone: "",
  email: "",
  isCooperative: false,
};

export default function Impostazioni() {
  const [activeTab, setActiveTab] = useState<TabKey>("aziende");
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyFormData>(emptyCompany);
  const [companyErrors, setCompanyErrors] = useState<CompanyFormErrors>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "company" | "site"; id: number } | null>(null);

  const utils = trpc.useUtils();
  const { data: companies, isLoading: companiesLoading } = trpc.settings.companies.useQuery();
  const { data: sites } = trpc.settings.sites.useQuery();
  const { data: jobRoles } = trpc.settings.jobRoles.useQuery();
  const { data: risks } = trpc.settings.risks.useQuery();
  const { data: trainingTypes } = trpc.settings.trainingTypes.useQuery();

  const createCompany = trpc.settings.createCompany.useMutation({
    onSuccess: () => {
      toast.success("Azienda creata con successo");
      utils.settings.companies.invalidate();
      setCompanyModalOpen(false);
      setCompanyForm(emptyCompany);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCompany = trpc.settings.updateCompany.useMutation({
    onSuccess: () => {
      toast.success("Azienda aggiornata con successo");
      utils.settings.companies.invalidate();
      setCompanyModalOpen(false);
      setCompanyForm(emptyCompany);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCompany = trpc.settings.deleteCompany.useMutation({
    onSuccess: () => {
      toast.success("Azienda eliminata");
      utils.settings.companies.invalidate();
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSite = trpc.settings.deleteSite.useMutation({
    onSuccess: () => {
      toast.success("Sede eliminata");
      utils.settings.sites.invalidate();
      setDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDeleteConfirm = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "company") {
      deleteCompany.mutate({ id: deleteConfirm.id });
    } else {
      deleteSite.mutate({ id: deleteConfirm.id });
    }
  };

  const exportSites = trpc.settings.exportSites.useQuery(undefined, {
    enabled: false,
  });

  const exportCompanies = trpc.settings.exportCompanies.useQuery(undefined, {
    enabled: false,
  });

  const handleExport = async () => {
    const { data } = await exportCompanies.refetch();
    if (!data || data.length === 0) {
      toast.info("Nessuna azienda da esportare");
      return;
    }
    const buf = exportTableToExcel(data, "Aziende", {
      name: "Nome",
      vatNumber: "Partita IVA",
      fiscalCode: "Codice Fiscale",
      address: "Indirizzo",
      city: "Città",
      province: "Provincia",
      zipCode: "CAP",
      phone: "Telefono",
      email: "Email",
      pec: "PEC",
      isCooperative: "Cooperativa",
    });
    downloadExcel(buf, `aziende_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`Esportate ${data.length} aziende`);
  };

  const handleExportSites = async () => {
    const { data } = await exportSites.refetch();
    if (!data || data.length === 0) {
      toast.info("Nessuna sede da esportare");
      return;
    }
    // Resolve company names for export
    const companyMap = new Map(companies?.map(c => [c.id, c.name]) ?? []);
    const enriched = data.map(s => ({
      ...s,
      companyName: companyMap.get(s.companyId) ?? "",
    }));
    const buf = exportTableToExcel(enriched, "Sedi", {
      name: "Nome",
      companyName: "Azienda",
      code: "Codice",
      address: "Indirizzo",
      city: "Città",
      province: "Provincia",
    });
    downloadExcel(buf, `sedi_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`Esportate ${data.length} sedi`);
  };

  const openCreateSite = () => {
    /* Site creation UI is not implemented in this revision. */
  };

  const openEditSite = () => {
    /* Site editing UI is not implemented in this revision. */
  };

  const openCreate = () => {
    setCompanyForm(emptyCompany);
    setCompanyErrors({});
    setCompanyModalOpen(true);
  };


  const openEdit = (company: NonNullable<typeof companies>[number]) => {
    setCompanyForm({
      id: company.id,
      name: company.name ?? "",
      vatNumber: company.vatNumber ?? "",
      fiscalCode: company.fiscalCode ?? "",
      address: company.address ?? "",
      city: company.city ?? "",
      province: company.province ?? "",
      zipCode: company.zipCode ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      isCooperative: company.isCooperative ?? false,
    });
    setCompanyErrors({});
    setCompanyModalOpen(true);
  };

  const updateCompanyField = <K extends keyof CompanyFormData>(
    field: K,
    value: CompanyFormData[K]
  ) => {
    setCompanyForm(current => ({ ...current, [field]: value }));
    if (field === "vatNumber" || field === "fiscalCode") {
      setCompanyErrors(current => ({
        ...current,
        vatNumber: undefined,
        fiscalCode: undefined,
      }));
    } else if (field !== "id" && field !== "isCooperative") {
      setCompanyErrors(current => ({ ...current, [field]: undefined }));
    }
  };

  const validateCompany = (data: CompanyFormData) => {
    const errors: CompanyFormErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.name.trim()) errors.name = "La ragione sociale è obbligatoria";
    if (!data.vatNumber.trim() && !data.fiscalCode.trim()) {
      const message =
        "Inserire almeno uno tra Partita IVA e Codice Fiscale";
      errors.vatNumber = message;
      errors.fiscalCode = message;
    }
    if (!data.address.trim()) errors.address = "L'indirizzo è obbligatorio";
    if (!data.city.trim()) errors.city = "La città è obbligatoria";
    if (!data.province.trim())
      errors.province = "La provincia è obbligatoria";
    if (!data.zipCode.trim()) errors.zipCode = "Il CAP è obbligatorio";
    if (!data.email.trim()) {
      errors.email = "L'email è obbligatoria";
    } else if (!emailPattern.test(data.email.trim())) {
      errors.email = "Inserire un indirizzo email valido";
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCompany(companyForm);
    if (Object.keys(errors).length > 0) {
      setCompanyErrors(errors);
      toast.error("Correggere i campi evidenziati");
      return;
    }

    const payload = {
      name: companyForm.name.trim(),
      vatNumber: companyForm.vatNumber.trim() || undefined,
      fiscalCode: companyForm.fiscalCode.trim() || undefined,
      address: companyForm.address.trim(),
      city: companyForm.city.trim(),
      province: companyForm.province.trim(),
      zipCode: companyForm.zipCode.trim(),
      phone: companyForm.phone.trim() || undefined,
      email: companyForm.email.trim(),
      isCooperative: companyForm.isCooperative,
    };

    if (companyForm.id) {
      updateCompany.mutate({ ...payload, id: companyForm.id });
    } else {
      createCompany.mutate(payload);
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
    { key: "aziende", label: "Aziende e Sedi", icon: Building2 },
    { key: "mansioni", label: "Mansioni", icon: Briefcase },
    { key: "rischi", label: "Rischi", icon: AlertTriangle },
    { key: "formazione", label: "Formazione", icon: GraduationCap },
    { key: "branding", label: "Branding", icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configurazione aziende, mansioni, rischi e tipologie formazione
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-700 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aziende */}
      {activeTab === "aziende" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-500" />
                Aziende
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={handleExport}>
                  <FileDown className="w-3.5 h-3.5" />
                  Esporta
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={openCreate}>
                  <Plus className="w-3.5 h-3.5" />
                  Nuova
                </Button>
              </div>
            </CardHeader>
            <div className="border-t border-gray-200 overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-[1fr_120px_120px_120px_80px_100px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-4 py-2.5">Nome</div>
                <div className="px-4 py-2.5">P.IVA</div>
                <div className="px-4 py-2.5">Città</div>
                <div className="px-4 py-2.5">Provincia</div>
                <div className="px-4 py-2.5 text-center">Sedi</div>
                <div className="px-4 py-2.5 text-center">Azioni</div>
              </div>
              {companiesLoading && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Caricamento...
                </div>
              )}
              {companies?.map((company) => (
                <div
                  key={company.id}
                  className="min-w-[900px] grid grid-cols-[1fr_120px_120px_120px_80px_100px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    <p className="text-[10px] text-gray-500">{company.address}</p>
                  </div>
                  <div className="px-4 py-3 text-xs text-gray-600">{company.vatNumber ?? "—"}</div>
                  <div className="px-4 py-3 text-xs text-gray-600">{company.city ?? "—"}</div>
                  <div className="px-4 py-3 text-xs text-gray-600">{company.province ?? "—"}</div>
                  <div className="px-4 py-3 flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      {company.sites?.length ?? 0}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(company)}
                      className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Modifica"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: "company", id: company.id })}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Sedi operative
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={handleExportSites}>
                  <FileDown className="w-3.5 h-3.5" />
                  Esporta
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={openCreateSite}>
                  <Plus className="w-3.5 h-3.5" />
                  Nuova
                </Button>
              </div>
            </CardHeader>
            <div className="border-t border-gray-200 overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-[1fr_1fr_120px_120px_100px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="px-4 py-2.5">Nome</div>
                <div className="px-4 py-2.5">Azienda</div>
                <div className="px-4 py-2.5">Città</div>
                <div className="px-4 py-2.5">Provincia</div>
                <div className="px-4 py-2.5 text-center">Azioni</div>
              </div>
              {sites?.map((site) => (
                <div
                  key={site.id}
                  className="min-w-[900px] grid grid-cols-[1fr_1fr_120px_120px_100px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{site.name}</p>
                    <p className="text-[10px] text-gray-500">{site.address}</p>
                  </div>
                  <div className="px-4 py-3 text-xs text-gray-600">{site.company?.name}</div>
                  <div className="px-4 py-3 text-xs text-gray-600">{site.city ?? "—"}</div>
                  <div className="px-4 py-3 text-xs text-gray-600">{site.province ?? "—"}</div>
                  <div className="px-4 py-3 flex items-center justify-center gap-1">
                    <button
                      onClick={openEditSite}
                      className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Modifica"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ type: "site", id: site.id })}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Mansioni */}
      {activeTab === "mansioni" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500" />
              Mansioni
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              Nuova mansione
            </Button>
          </CardHeader>
          <div className="border-t border-gray-200 overflow-x-auto">
            <div className="min-w-[800px] grid grid-cols-[180px_100px_1fr_1fr_80px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="px-4 py-2.5">Mansione</div>
              <div className="px-4 py-2.5">Livello rischio</div>
              <div className="px-4 py-2.5">Rischi</div>
              <div className="px-4 py-2.5">Formazione richiesta</div>
              <div className="px-4 py-2.5 text-center">Visita</div>
            </div>
            {jobRoles?.map((role) => {
              const riskColors = getRiskLevelColor(role.riskLevel);
              return (
                <div
                  key={role.id}
                  className="min-w-[800px] grid grid-cols-[180px_100px_1fr_1fr_80px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    <p className="text-[10px] text-gray-500">{role.description}</p>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <Badge
                      variant="outline"
                      className={`${riskColors.bg} ${riskColors.text} border-0 text-[10px]`}
                    >
                      {role.riskLevel}
                    </Badge>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {role.jobRoleRisks?.map((jrr) => (
                        <Badge key={jrr.id} variant="outline" className="text-[9px] bg-gray-50">
                          {jrr.risk?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {role.jobRoleTraining?.map((jrt) => (
                        <Badge
                          key={jrt.id}
                          variant="outline"
                          className="text-[9px] bg-blue-50 text-blue-700"
                        >
                          {jrt.trainingType?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center">
                    {role.requiresMedicalVisit ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-0 text-[10px]">
                        SI
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Rischi */}
      {activeTab === "rischi" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              Rischi
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              Nuovo rischio
            </Button>
          </CardHeader>
          <div className="border-t border-gray-200 overflow-x-auto">
            <div className="min-w-[600px] grid grid-cols-[120px_1fr_1fr_120px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="px-4 py-2.5">Codice</div>
              <div className="px-4 py-2.5">Nome</div>
              <div className="px-4 py-2.5">Descrizione</div>
              <div className="px-4 py-2.5">Categoria</div>
            </div>
            {risks?.map((risk) => (
              <div
                key={risk.id}
                className="min-w-[600px] grid grid-cols-[120px_1fr_1fr_120px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{risk.code}</code>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{risk.name}</p>
                </div>
                <div className="px-4 py-3 text-xs text-gray-600">
                  {risk.description ?? "—"}
                </div>
                <div className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {risk.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Formazione */}
      {activeTab === "formazione" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-gray-500" />
              Tipologie formazione
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              Nuova tipologia
            </Button>
          </CardHeader>
          <div className="border-t border-gray-200 overflow-x-auto">
            <div className="min-w-[700px] grid grid-cols-[100px_1fr_180px_100px_100px] bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="px-4 py-2.5">Codice</div>
              <div className="px-4 py-2.5">Nome</div>
              <div className="px-4 py-2.5">Normativa</div>
              <div className="px-4 py-2.5">Categoria</div>
              <div className="px-4 py-2.5 text-center">Validita (mesi)</div>
            </div>
            {trainingTypes?.map((tt) => (
              <div
                key={tt.id}
                className="min-w-[700px] grid grid-cols-[100px_1fr_180px_100px_100px] border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <div className="px-4 py-3">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{tt.code}</code>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{tt.name}</p>
                </div>
                <div className="px-4 py-3 text-xs text-gray-600">
                  {tt.normativeReference ?? "—"}
                </div>
                <div className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px]">
                    {tt.category}
                  </Badge>
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <span className="text-xs text-gray-600">
                    {tt.defaultValidityMonths ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Branding */}
      {activeTab === "branding" && <BrandingPanel />}

      {/* Company Modal */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">
                {companyForm.id ? "Modifica Azienda" : "Nuova Azienda"}
              </h3>
              <button
                onClick={() => setCompanyModalOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {Object.keys(companyErrors).length > 0 && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  Correggere i campi evidenziati prima di salvare.
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ragione sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => updateCompanyField("name", e.target.value)}
                  aria-invalid={Boolean(companyErrors.name)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                    companyErrors.name
                      ? "border-red-500 focus:ring-red-200"
                      : "focus:ring-blue-500"
                  }`}
                  placeholder="Es. Edilizia Nord Srl"
                  required
                />
                {companyErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{companyErrors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Partita IVA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.vatNumber}
                    onChange={(e) => updateCompanyField("vatNumber", e.target.value)}
                    aria-invalid={Boolean(companyErrors.vatNumber)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      companyErrors.vatNumber
                        ? "border-red-500 focus:ring-red-200"
                        : "focus:ring-blue-500"
                    }`}
                    placeholder="12345678901"
                  />
                  {companyErrors.vatNumber && (
                    <p className="mt-1 text-xs text-red-600">
                      {companyErrors.vatNumber}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Codice Fiscale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.fiscalCode}
                    onChange={(e) => updateCompanyField("fiscalCode", e.target.value)}
                    aria-invalid={Boolean(companyErrors.fiscalCode)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      companyErrors.fiscalCode
                        ? "border-red-500 focus:ring-red-200"
                        : "focus:ring-blue-500"
                    }`}
                    placeholder=""
                  />
                  {companyErrors.fiscalCode && (
                    <p className="mt-1 text-xs text-red-600">
                      {companyErrors.fiscalCode}
                    </p>
                  )}
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-gray-500">
                È obbligatorio compilare almeno uno tra Partita IVA e Codice
                Fiscale.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Indirizzo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => updateCompanyField("address", e.target.value)}
                  aria-invalid={Boolean(companyErrors.address)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                    companyErrors.address
                      ? "border-red-500 focus:ring-red-200"
                      : "focus:ring-blue-500"
                  }`}
                  placeholder="Via Roma 123"
                />
                {companyErrors.address && (
                  <p className="mt-1 text-xs text-red-600">
                    {companyErrors.address}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Città <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => updateCompanyField("city", e.target.value)}
                    aria-invalid={Boolean(companyErrors.city)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      companyErrors.city
                        ? "border-red-500 focus:ring-red-200"
                        : "focus:ring-blue-500"
                    }`}
                    placeholder="Milano"
                  />
                  {companyErrors.city && (
                    <p className="mt-1 text-xs text-red-600">{companyErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Provincia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.province}
                    onChange={(e) =>
                      updateCompanyField("province", e.target.value)
                    }
                    aria-invalid={Boolean(companyErrors.province)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      companyErrors.province
                        ? "border-red-500 focus:ring-red-200"
                        : "focus:ring-blue-500"
                    }`}
                    placeholder="MI"
                  />
                  {companyErrors.province && (
                    <p className="mt-1 text-xs text-red-600">
                      {companyErrors.province}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CAP <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.zipCode}
                    onChange={(e) => updateCompanyField("zipCode", e.target.value)}
                    aria-invalid={Boolean(companyErrors.zipCode)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      companyErrors.zipCode
                        ? "border-red-500 focus:ring-red-200"
                        : "focus:ring-blue-500"
                    }`}
                    placeholder="20121"
                  />
                  {companyErrors.zipCode && (
                    <p className="mt-1 text-xs text-red-600">
                      {companyErrors.zipCode}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => updateCompanyField("phone", e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="02 1234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => updateCompanyField("email", e.target.value)}
                    aria-invalid={Boolean(companyErrors.email)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 ${
                      companyErrors.email
                        ? "border-red-500 focus:ring-red-200"
                        : "focus:ring-blue-500"
                    }`}
                    placeholder="info@azienda.it"
                    required
                  />
                  {companyErrors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {companyErrors.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCooperative"
                  checked={companyForm.isCooperative}
                  onChange={(e) =>
                    updateCompanyField("isCooperative", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isCooperative" className="text-sm text-gray-700">
                  Cooperativa
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompanyModalOpen(false)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createCompany.isPending || updateCompany.isPending}
                >
                  {(createCompany.isPending || updateCompany.isPending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  )}
                  {companyForm.id ? "Salva modifiche" : "Crea azienda"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Conferma eliminazione</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Sei sicuro di voler eliminare questa {deleteConfirm.type === "company" ? "azienda" : "sede"}? L&apos;azione è irreversibile.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
              >
                Annulla
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirm}
                disabled={deleteCompany.isPending || deleteSite.isPending}
              >
                {(deleteCompany.isPending || deleteSite.isPending) && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                Elimina
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
