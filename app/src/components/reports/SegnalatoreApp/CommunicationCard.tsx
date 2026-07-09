import { AlertCircle, CheckCircle2, Clock3, Image, Newspaper, PlayCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { CommunicationActionHandler, CommunicationType, SafetyCommunication } from "./types";

const communicationTypeIcons: Record<CommunicationType, LucideIcon> = {
  Video: PlayCircle,
  Circolare: Newspaper,
  Infografica: Image,
  Avviso: AlertCircle,
};

type CommunicationCardProps = {
  communication: SafetyCommunication;
  onAcknowledge: CommunicationActionHandler;
  onOpen: CommunicationActionHandler;
};

export function CommunicationCard({ communication, onAcknowledge, onOpen }: Readonly<CommunicationCardProps>) {
  const TypeIcon = communicationTypeIcons[communication.type];

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{communication.id}</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900">{communication.title}</h2>
        </div>
        <StatusBadge status={communication.status} />
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{communication.description}</p>

      <div className="mt-3 grid gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <TypeIcon className="h-3.5 w-3.5" />
          {communication.type}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          Pubblicata: {communication.publishedAt}
        </span>
        {communication.acknowledgementDue && (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Scadenza presa visione: {communication.acknowledgementDue}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
          onClick={() => onOpen(communication)}
        >
          Apri
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
          onClick={() => onAcknowledge(communication)}
        >
          Presa visione
        </button>
      </div>
    </article>
  );
}
