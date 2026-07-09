import { CommunicationCard } from "./CommunicationCard";
import type { CommunicationActionHandler, SafetyCommunication } from "./types";

type ComunicazioniTabProps = {
  communications: SafetyCommunication[];
  onAcknowledge: CommunicationActionHandler;
  onOpen: CommunicationActionHandler;
};

export function ComunicazioniTab({ communications, onAcknowledge, onOpen }: Readonly<ComunicazioniTabProps>) {
  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Comunicazioni Sicurezza</p>
          <p className="text-xs text-slate-500">Video, circolari, infografiche e avvisi mock</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {communications.length}
        </span>
      </div>

      <div className="space-y-3">
        {communications.map((communication) => (
          <CommunicationCard
            key={communication.id}
            communication={communication}
            onAcknowledge={onAcknowledge}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}
