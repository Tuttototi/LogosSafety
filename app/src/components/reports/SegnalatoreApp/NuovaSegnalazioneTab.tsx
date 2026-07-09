import type { ChangeEvent } from "react";
import { Upload } from "lucide-react";
import type { DraftChangeHandler, DraftReport, SubmitHandler } from "./types";

type NuovaSegnalazioneTabProps = {
  attachments: string[];
  draft: DraftReport;
  idPrefix: string;
  isMobile: boolean;
  onDraftChange: DraftChangeHandler;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: SubmitHandler;
};

export function NuovaSegnalazioneTab(props: Readonly<NuovaSegnalazioneTabProps>) {
  const { attachments, draft, idPrefix, isMobile, onDraftChange, onFileChange, onSubmit } = props;

  return (
    <form className="mt-5 space-y-4" onSubmit={onSubmit}>
      <div>
        <label htmlFor={`${idPrefix}-location`} className="mb-1 block text-sm font-medium text-slate-800">
          Appalto / Commessa / Impianto *
        </label>
        <select
          id={`${idPrefix}-location`}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
          value={draft.location}
          onChange={onDraftChange("location")}
        >
          <option value="">Seleziona contesto</option>
          <option value="Appalto Milano - Impianto Nord">Appalto Milano - Impianto Nord</option>
          <option value="Commessa Torino - Linea 2">Commessa Torino - Linea 2</option>
          <option value="Impianto Bologna">Impianto Bologna</option>
        </select>
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
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-attachments`} className="mb-1 block text-sm font-medium text-slate-800">
          Foto / Allegati
        </label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
          <Upload className="h-4 w-4" />
          Seleziona file
          <input
            id={`${idPrefix}-attachments`}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
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

      <button
        type="submit"
        className="w-full rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Invia Segnalazione
      </button>
    </form>
  );
}
