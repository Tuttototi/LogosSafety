import type { ChangeEvent } from "react";
import { Info, Upload } from "lucide-react";
import {
  ATTACHMENTS_DISABLED_MESSAGE,
  OPERATIONAL_SCOPE_EMPTY_MESSAGE,
  OPERATIONAL_SCOPE_ERROR_MESSAGE,
  OPERATIONAL_SCOPE_LOADING_MESSAGE,
  type AvailableOperationalScope,
  type OperationalScopeLoadState,
  type OperationalScopeOption,
} from "@/modules/segnalazioni/ui";
import type { DraftChangeHandler, DraftReport, SubmitHandler } from "./types";

type NuovaSegnalazioneTabProps = {
  attachments: string[];
  draft: DraftReport;
  errorMessage: string;
  idPrefix: string;
  isMobile: boolean;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  operationalScope?: AvailableOperationalScope;
  operationalScopeErrorMessage: string;
  operationalScopeState: OperationalScopeLoadState;
  onDraftChange: DraftChangeHandler;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRetryOperationalScope: () => void;
  onSubmit: SubmitHandler;
};

function optionLabel(option: OperationalScopeOption): string {
  return option.code ? `${option.code} - ${option.name}` : option.name;
}

export function NuovaSegnalazioneTab(props: Readonly<NuovaSegnalazioneTabProps>) {
  const {
    attachments,
    draft,
    errorMessage,
    idPrefix,
    isMobile,
    isSubmitDisabled,
    isSubmitting,
    operationalScope,
    operationalScopeErrorMessage,
    operationalScopeState,
    onDraftChange,
    onFileChange,
    onRetryOperationalScope,
    onSubmit,
  } = props;
  const contracts = operationalScope?.contracts ?? [];
  const sites = operationalScope?.sites ?? [];
  const plants = operationalScope?.plants ?? [];
  const areas = operationalScope?.areas ?? [];
  const visibleSites = draft.contractId
    ? sites.filter((site) => !site.contractId || site.contractId === draft.contractId)
    : sites;
  const visiblePlants = plants.filter((plant) => {
    if (draft.siteId) return !plant.siteId || plant.siteId === draft.siteId;
    if (draft.contractId) return !plant.contractId || plant.contractId === draft.contractId;
    return true;
  });

  return (
    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-red-600" />
          <p>
            Appalto, azienda e perimetro operativo sono assegnati dal backend in base al tuo profilo LogosSafety.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
        <p className="text-sm font-semibold text-slate-900">Contesto operativo</p>

        {operationalScopeState === "loading" && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {OPERATIONAL_SCOPE_LOADING_MESSAGE}
          </p>
        )}

        {operationalScopeState === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{operationalScopeErrorMessage || OPERATIONAL_SCOPE_ERROR_MESSAGE}</p>
            <button type="button" className="mt-2 font-semibold underline" onClick={onRetryOperationalScope}>
              Riprova
            </button>
          </div>
        )}

        {operationalScopeState === "empty" && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {OPERATIONAL_SCOPE_EMPTY_MESSAGE}
          </p>
        )}

        {operationalScopeState === "ready" && contracts.length > 0 && (
          <div>
            <label htmlFor={`${idPrefix}-contract`} className="mb-1 block text-sm font-medium text-slate-800">
              Appalto / Commessa *
            </label>
            <select
              id={`${idPrefix}-contract`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.contractId}
              onChange={onDraftChange("contractId")}
            >
              {contracts.length > 1 && <option value="">Seleziona appalto o commessa</option>}
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {optionLabel(contract)}
                </option>
              ))}
            </select>
          </div>
        )}

        {operationalScopeState === "ready" && visibleSites.length > 0 && (
          <div>
            <label htmlFor={`${idPrefix}-site`} className="mb-1 block text-sm font-medium text-slate-800">
              Sede
            </label>
            <select
              id={`${idPrefix}-site`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.siteId}
              onChange={onDraftChange("siteId")}
            >
              {visibleSites.length > 1 && <option value="">Seleziona sede</option>}
              {visibleSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {optionLabel(site)}
                </option>
              ))}
            </select>
          </div>
        )}

        {operationalScopeState === "ready" && visiblePlants.length > 0 && (
          <div>
            <label htmlFor={`${idPrefix}-plant`} className="mb-1 block text-sm font-medium text-slate-800">
              Impianto
            </label>
            <select
              id={`${idPrefix}-plant`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.plantId}
              onChange={onDraftChange("plantId")}
            >
              {visiblePlants.length > 1 && <option value="">Seleziona impianto</option>}
              {visiblePlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {optionLabel(plant)}
                </option>
              ))}
            </select>
          </div>
        )}

        {operationalScopeState === "ready" && areas.length > 0 && (
          <div>
            <label htmlFor={`${idPrefix}-area`} className="mb-1 block text-sm font-medium text-slate-800">
              Area
            </label>
            <select
              id={`${idPrefix}-area`}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              value={draft.areaId}
              onChange={onDraftChange("areaId")}
            >
              {areas.length > 1 && <option value="">Seleziona area</option>}
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {optionLabel(area)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-title`} className="mb-1 block text-sm font-medium text-slate-800">
          Titolo *
        </label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          placeholder="Es. Transenna danneggiata"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
          value={draft.title}
          onChange={onDraftChange("title")}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-description`} className="mb-1 block text-sm font-medium text-slate-800">
          Descrizione *
        </label>
        <textarea
          id={`${idPrefix}-description`}
          rows={isMobile ? 4 : 5}
          placeholder="Descrivi il problema riscontrato"
          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
          value={draft.description}
          onChange={onDraftChange("description")}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-priority`} className="mb-1 block text-sm font-medium text-slate-800">
          Priorita'
        </label>
        <select
          id={`${idPrefix}-priority`}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
          value={draft.priority}
          onChange={onDraftChange("priority")}
        >
          <option value="Bassa">Bassa</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
          <option value="Critica">Critica</option>
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-attachments`} className="mb-1 block text-sm font-medium text-slate-800">
          Foto / Allegati
        </label>
        <label className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
          <Upload className="h-4 w-4" />
          {ATTACHMENTS_DISABLED_MESSAGE}
          <input
            id={`${idPrefix}-attachments`}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            disabled
            onChange={onFileChange}
          />
        </label>
        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <span key={attachment} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {attachment}
              </span>
            ))}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
      >
        {isSubmitting ? "Invio in corso..." : "Invia Segnalazione"}
      </button>
    </form>
  );
}
