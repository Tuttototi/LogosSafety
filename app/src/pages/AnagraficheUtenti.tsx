import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import type { Role as CoreRole } from "@/modules/core/domain";
import { trpc } from "@/providers/trpc";
import { ShieldAlert, UserPlus, UsersRound } from "lucide-react";

type BooleanFilter = "all" | "true" | "false";
type AdminRole = CoreRole;

type PersonFormState = {
  firstName: string;
  lastName: string;
  fiscalCode: string;
  birthDate: string;
  birthPlace: string;
  email: string;
  phone: string;
  companyId: string;
  siteId: string;
  contractId: string;
  jobRoleId: string;
  active: boolean;
  accountEnabled: boolean;
  accountRole: AdminRole;
  accountActive: boolean;
};

const initialForm: PersonFormState = {
  firstName: "",
  lastName: "",
  fiscalCode: "",
  birthDate: "",
  birthPlace: "",
  email: "",
  phone: "",
  companyId: "",
  siteId: "",
  contractId: "",
  jobRoleId: "",
  active: true,
  accountEnabled: false,
  accountRole: "segnalatore",
  accountActive: true,
};

function toOptionalNumber(value: string): number | null {
  return value ? Number(value) : null;
}

function toBooleanFilter(value: BooleanFilter): boolean | undefined {
  if (value === "all") return undefined;
  return value === "true";
}

function Field(props: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {props.label}
      </Label>
      {props.children}
    </div>
  );
}

export default function AnagraficheUtenti() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminRole | "all">("all");
  const [personActive, setPersonActive] = useState<BooleanFilter>("all");
  const [accountPresent, setAccountPresent] = useState<BooleanFilter>("all");
  const [accountActive, setAccountActive] = useState<BooleanFilter>("all");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [form, setForm] = useState<PersonFormState>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const optionsQuery = trpc.adminIdentity.options.useQuery(undefined, { enabled: isAdmin });
  const peopleQuery = trpc.adminIdentity.list.useQuery({
    search: search || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
    personActive: toBooleanFilter(personActive),
    accountPresent: toBooleanFilter(accountPresent),
    accountActive: toBooleanFilter(accountActive),
  }, { enabled: isAdmin });

  const selectedQuery = trpc.adminIdentity.detail.useQuery(
    { personId: selectedPersonId ?? 0 },
    { enabled: isAdmin && Boolean(selectedPersonId) },
  );

  const createMutation = trpc.adminIdentity.createPerson.useMutation({
    onSuccess: async (person) => {
      setSelectedPersonId(person.id);
      setForm((current) => ({ ...initialForm, companyId: current.companyId }));
      setMessage("Persona creata correttamente");
      setError(null);
      await utils.adminIdentity.list.invalidate();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const enableAccountMutation = trpc.adminIdentity.enableAccount.useMutation({
    onSuccess: async () => {
      setMessage("Account aggiornato");
      setError(null);
      await Promise.all([
        utils.adminIdentity.list.invalidate(),
        utils.adminIdentity.detail.invalidate(),
      ]);
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const assignRoleMutation = trpc.adminIdentity.assignRole.useMutation({
    onSuccess: async () => {
      setMessage("Ruolo aggiornato");
      setError(null);
      await Promise.all([
        utils.adminIdentity.list.invalidate(),
        utils.adminIdentity.detail.invalidate(),
      ]);
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const updateScopeMutation = trpc.adminIdentity.updateOrganizationalScope.useMutation({
    onSuccess: async () => {
      setMessage("Scope aggiornato");
      setError(null);
      await Promise.all([
        utils.adminIdentity.list.invalidate(),
        utils.adminIdentity.detail.invalidate(),
      ]);
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const updateStatusMutation = trpc.adminIdentity.updateAccountStatus.useMutation({
    onSuccess: async () => {
      setMessage("Stato account aggiornato");
      setError(null);
      await Promise.all([
        utils.adminIdentity.list.invalidate(),
        utils.adminIdentity.detail.invalidate(),
      ]);
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const options = optionsQuery.data;
  const selected = selectedQuery.data ?? null;
  const selectedCompanyId = form.companyId || (options?.companies[0]?.id ? String(options.companies[0].id) : "");

  const filteredSites = useMemo(() => {
    const companyId = Number(selectedCompanyId);
    return options?.sites.filter((site) => site.companyId === companyId) ?? [];
  }, [selectedCompanyId, options?.sites]);

  const filteredContracts = useMemo(() => {
    const siteId = Number(form.siteId);
    return options?.contracts.filter((contract) => !siteId || contract.siteId === siteId) ?? [];
  }, [form.siteId, options?.contracts]);

  const selectedScope = {
    companyId: selected?.companyId ?? Number(selectedCompanyId),
    siteId: selected?.account?.scope?.siteId ?? selected?.siteId ?? null,
    contractId: selected?.account?.scope?.contractId ?? selected?.contractId ?? null,
  };

  const pending = createMutation.isPending ||
    enableAccountMutation.isPending ||
    assignRoleMutation.isPending ||
    updateScopeMutation.isPending ||
    updateStatusMutation.isPending;

  function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const companyId = Number(selectedCompanyId);
    const siteId = toOptionalNumber(form.siteId);
    const contractId = toOptionalNumber(form.contractId);

    createMutation.mutate({
      firstName: form.firstName,
      lastName: form.lastName,
      fiscalCode: form.fiscalCode,
      birthDate: form.birthDate,
      birthPlace: form.birthPlace,
      email: form.email,
      phone: form.phone,
      companyId,
      siteId,
      contractId,
      jobRoleId: toOptionalNumber(form.jobRoleId),
      active: form.active,
      account: {
        enabled: form.accountEnabled,
        role: form.accountRole,
        active: form.accountActive,
        scope: { companyId, siteId, contractId },
      },
    });
  }

  function enableSelectedAccount() {
    if (!selected) return;
    enableAccountMutation.mutate({
      personId: selected.id,
      role: selected.account?.role ?? form.accountRole,
      active: true,
      scope: {
        companyId: selected.companyId,
        siteId: selected.siteId,
        contractId: selected.contractId,
      },
    });
  }

  function updateSelectedRole(role: string) {
    if (!selected?.account) return;
    assignRoleMutation.mutate({ personId: selected.id, role: role as AdminRole });
  }

  function updateSelectedScope() {
    if (!selected) return;
    updateScopeMutation.mutate({
      personId: selected.id,
      scope: {
        companyId: selected.companyId,
        siteId: selected.siteId,
        contractId: selected.contractId,
      },
    });
  }

  function toggleAccountStatus() {
    if (!selected?.account) return;
    const nextStatus = !selected.account.active;
    if (!nextStatus && !window.confirm("Confermi il blocco dell'account selezionato?")) {
      return;
    }
    updateStatusMutation.mutate({ personId: selected.id, active: nextStatus });
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Accesso non autorizzato</h1>
          <p className="mt-2 text-sm text-slate-600">
            La gestione Anagrafiche e Utenti e riservata agli amministratori.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-red-700">
            Amministrazione
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Anagrafiche e Utenti</h1>
          <p className="mt-1 text-sm text-slate-600">
            Gestione separata di persone censite, account, ruoli e perimetri organizzativi.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-red-200 bg-red-50 text-red-700">
          <UsersRound className="mr-1 h-3.5 w-3.5" />
          Solo Admin
        </Badge>
      </div>

      {(message || error) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {error ?? message}
        </div>
      )}

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.2fr_repeat(4,minmax(130px,0.45fr))]">
        <Field label="Ricerca">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, cognome, email, codice fiscale"
          />
        </Field>
        <Field label="Ruolo">
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as AdminRole | "all")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {options?.roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Persona">
          <Select value={personActive} onValueChange={(value) => setPersonActive(value as BooleanFilter)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="true">Attive</SelectItem>
              <SelectItem value="false">Inattive</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Account">
          <Select value={accountPresent} onValueChange={(value) => setAccountPresent(value as BooleanFilter)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="true">Presente</SelectItem>
              <SelectItem value="false">Assente</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Stato account">
          <Select value={accountActive} onValueChange={(value) => setAccountActive(value as BooleanFilter)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="true">Attivo</SelectItem>
              <SelectItem value="false">Bloccato</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Persone censite</h2>
          </div>
          {peopleQuery.isLoading ? (
            <div className="p-6 text-sm text-slate-600">Caricamento anagrafiche...</div>
          ) : peopleQuery.error ? (
            <div className="p-6 text-sm text-red-700">{peopleQuery.error.message}</div>
          ) : peopleQuery.data?.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">Nessuna persona trovata.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead>Codice fiscale</TableHead>
                  <TableHead>Contatti</TableHead>
                  <TableHead>Azienda</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peopleQuery.data?.map((person) => (
                  <TableRow key={person.id} data-state={selectedPersonId === person.id ? "selected" : undefined}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{person.lastName} {person.firstName}</div>
                      <div className="text-xs text-slate-500">{person.active ? "Persona attiva" : "Persona inattiva"}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{person.fiscalCodeMasked}</TableCell>
                    <TableCell>
                      <div>{person.email ?? "Email assente"}</div>
                      <div className="text-xs text-slate-500">{person.phone ?? "Telefono assente"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{person.companyName ?? "Azienda non disponibile"}</div>
                      <div className="text-xs text-slate-500">{person.siteName ?? person.contractName ?? "Scope company"}</div>
                    </TableCell>
                    <TableCell>
                      {person.account ? (
                        <div className="space-y-1">
                          <Badge variant="outline">{person.account.roleLabel}</Badge>
                          <div className="text-xs text-slate-500">{person.account.active ? "Attivo" : "Bloccato"}</div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600">Assente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPersonId(person.id)}>
                        Dettaglio
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-red-700" />
              <h2 className="font-semibold text-slate-900">Nuova persona</h2>
            </div>
            <form className="space-y-4" onSubmit={submitCreate}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome *">
                  <Input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required />
                </Field>
                <Field label="Cognome *">
                  <Input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
                </Field>
              </div>
              <Field label="Codice fiscale *">
                <Input value={form.fiscalCode} onChange={(event) => setForm({ ...form, fiscalCode: event.target.value })} maxLength={16} required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data nascita *">
                  <Input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} required />
                </Field>
                <Field label="Luogo nascita *">
                  <Input value={form.birthPlace} onChange={(event) => setForm({ ...form, birthPlace: event.target.value })} required />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </Field>
                <Field label="Telefono">
                  <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </Field>
              </div>
              <Field label="Azienda *">
                <Select value={selectedCompanyId} onValueChange={(value) => setForm({ ...form, companyId: value, siteId: "", contractId: "" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                  <SelectContent>
                    {options?.companies.map((company) => (
                      <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Sede">
                  <Select value={form.siteId || "none"} onValueChange={(value) => setForm({ ...form, siteId: value === "none" ? "" : value, contractId: "" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Scope company</SelectItem>
                      {filteredSites.map((site) => (
                        <SelectItem key={site.id} value={String(site.id)}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Appalto">
                  <Select value={form.contractId || "none"} onValueChange={(value) => setForm({ ...form, contractId: value === "none" ? "" : value })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessun appalto</SelectItem>
                      {filteredContracts.map((contract) => (
                        <SelectItem key={contract.id} value={String(contract.id)}>{contract.code} - {contract.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Mansione">
                <Select value={form.jobRoleId || "none"} onValueChange={(value) => setForm({ ...form, jobRoleId: value === "none" ? "" : value })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Mansione tecnica default</SelectItem>
                    {options?.jobRoles.map((jobRole) => (
                      <SelectItem key={jobRole.id} value={String(jobRole.id)}>{jobRole.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <Label className="text-sm font-medium">Persona attiva</Label>
                  <p className="text-xs text-slate-500">Disattivare solo per persone non operative.</p>
                </div>
                <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
              </div>
              <div className="space-y-3 rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Abilita accesso a LogosSafety</Label>
                    <p className="text-xs text-slate-500">Se disattivo viene creata solo la persona.</p>
                  </div>
                  <Switch checked={form.accountEnabled} onCheckedChange={(checked) => setForm({ ...form, accountEnabled: checked })} />
                </div>
                {form.accountEnabled && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Ruolo">
                      <Select value={form.accountRole} onValueChange={(value) => setForm({ ...form, accountRole: value as AdminRole })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {options?.roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Stato">
                      <Select value={form.accountActive ? "true" : "false"} onValueChange={(value) => setForm({ ...form, accountActive: value === "true" })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Attivo</SelectItem>
                          <SelectItem value="false">Bloccato</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}
              </div>
              <Button className="w-full" disabled={pending || !options?.companies.length} type="submit">
                Crea persona
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Dettaglio account</h2>
            {!selectedPersonId ? (
              <p className="mt-3 text-sm text-slate-600">Seleziona una persona per gestire account, ruolo e scope.</p>
            ) : selectedQuery.isLoading ? (
              <p className="mt-3 text-sm text-slate-600">Caricamento dettaglio...</p>
            ) : selectedQuery.error ? (
              <p className="mt-3 text-sm text-red-700">{selectedQuery.error.message}</p>
            ) : selected ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{selected.firstName} {selected.lastName}</p>
                  <p className="text-xs text-slate-500">{selected.email ?? "Email assente"} - {selected.fiscalCodeMasked}</p>
                </div>
                {selected.account ? (
                  <>
                    <Field label="Ruolo account">
                      <Select value={selected.account.role} onValueChange={updateSelectedRole} disabled={pending}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {options?.roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Textarea
                      readOnly
                      value={`Company: ${selectedScope.companyId}\nSede: ${selectedScope.siteId ?? "tutte"}\nAppalto: ${selectedScope.contractId ?? "tutti"}`}
                      className="min-h-24 text-xs"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" disabled={pending} onClick={updateSelectedScope}>
                        Aggiorna scope dalla persona
                      </Button>
                      <Button variant={selected.account.active ? "destructive" : "default"} disabled={pending} onClick={toggleAccountStatus}>
                        {selected.account.active ? "Blocca account" : "Riattiva account"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">La persona non ha account e non puo autenticarsi.</p>
                    <Button disabled={pending || !selected.email} onClick={enableSelectedAccount}>
                      Abilita account Segnalatore
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
