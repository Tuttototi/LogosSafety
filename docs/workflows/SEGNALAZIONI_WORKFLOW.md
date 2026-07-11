# Workflow Operativo Segnalazioni

## Stati

Il workflow ufficiale resta definito nel Domain Layer:

```text
Nuova
-> Presa in carico
-> In lavorazione
-> Richiesta integrazione
-> Integrata
-> Risolta
-> Chiusa
```

Le API e la UI non decidono autonomamente le transizioni. Ogni mutation passa dai use case Application e dalle funzioni di dominio.

## Ruoli e capability

Le capability del dettaglio sono calcolate server-side usando:

- actor risolto dal Core Identity Context;
- tenant e company dell'attore;
- organizational scope;
- visibilita' e ownership;
- ruolo;
- stato corrente;
- workflow domain.

Il DTO espone:

- `canComment`;
- `canTakeInCharge`;
- `canRequestIntegration`;
- `canIntegrate`;
- `canResolve`;
- `canClose`;
- `canAcknowledge`;
- `allowedStatusTransitions`.

Il frontend usa queste capability solo per mostrare o nascondere le azioni. La sicurezza resta nel backend.

## Procedure API

Le procedure operative protette sono:

- `segnalazioni.addComment`;
- `segnalazioni.requestIntegration`;
- `segnalazioni.integrate`;
- `segnalazioni.takeInCharge`;
- `segnalazioni.changeStatus`;
- `segnalazioni.resolve`;
- `segnalazioni.close`;
- `segnalazioni.acknowledge`.

Il client invia solo id, testo/note e target status dove previsto. Non invia autore, tenant, company, ruolo, previous status, override o force.

## Commenti

I commenti reali sono persistiti in `segnalazione_comments`.

Il backend deriva:

- tenant;
- company;
- autore;
- display name;
- timestamp.

Il testo e' trattato come plain text, con trim, obbligatorieta' e limite massimo applicativo.

## Timeline

La timeline del dettaglio deriva da dati persistiti:

- creazione dalla riga `segnalazioni`;
- transizioni da `segnalazione_workflow_events`;
- commenti da `segnalazione_comments`;
- prese visione da `segnalazione_acknowledgements`.

Tipi esposti:

- `created`;
- `taken_in_charge`;
- `comment_added`;
- `integration_requested`;
- `integrated`;
- `status_changed`;
- `resolved`;
- `closed`;
- `acknowledged`.

La timeline non espone payload tecnici, stack, dati economici o dati personali non necessari.

## Audit e notifiche

I use case Application continuano a emettere eventi verso `AuditPort` e `NotificationPort`.

In questo sprint:

- la timeline workflow e' persistita e visibile;
- AuditPort e NotificationPort restano adapter deferred/noop nel boundary API;
- non viene simulato un audit globale persistente;
- non viene introdotto event bus o outbox.

La timeline operativa non sostituisce il futuro Audit Log globale.

## Limiti residui

- Non esiste ancora UI di assegnazione utenti.
- Il ruolo dell'attore sugli eventi workflow storici non e' sempre disponibile nello schema attuale.
- Allegati reali, mention, reaction e allegati commento restano fuori scope.
- Audit atomico globale e notifiche reali richiedono sprint dedicati.
- La concorrenza su presa in carico e' gestita a livello di stato corrente; non c'e' lock distribuito.
