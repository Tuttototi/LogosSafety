# SegnalatoreApp Integration

## Stato

`SegnalatoreApp` usa le API reali Segnalazioni per:

- lista segnalazioni visibili;
- creazione nuova segnalazione;
- dettaglio segnalazione;
- contesti operativi selezionabili tramite `segnalazioni.availableScope`.
- commenti, timeline e workflow operativo tramite capability backend.

La stessa app e' montata in:

- `/segnalazioni/app`;
- smartphone floating nella pagina `/segnalazioni`.

La pagina `/segnalazioni` usa lo stesso layer dati frontend e non mantiene piu' una lista mock di segnalazioni.

## Flusso dati

```text
SegnalatoreApp React
  -> hooks UI Segnalazioni
  -> tRPC client esistente
  -> segnalazioni.availableScope/create/list/byId/workflow mutations
  -> Application use cases
  -> DrizzleSegnalazioniRepository
  -> MySQL locale/ambiente configurato
```

Il frontend non invia:

- tenant;
- azienda;
- persona;
- utente;
- ruolo;
- reporter;
- stato;
- privilegi.

Questi valori vengono risolti dal Core Identity Context backend.

## Hook frontend

Il layer `app/src/modules/segnalazioni/ui` contiene:

- `useSegnalazioni()`: carica `segnalazioni.list`;
- `useSegnalazioneDetail(id)`: carica `segnalazioni.byId`;
- `useCreateSegnalazione()`: invia `segnalazioni.create` e invalida la lista;
- `useAvailableOperationalScope()`: carica appalti, sedi e impianti visibili all'attore;
- mapper DTO -> UI;
- builder payload create.

## Mapping form -> API

Il form mobile mantiene campi operatore:

- Appalto / Commessa;
- Sede, se presente;
- Impianto, se presente;
- Area, se presente;
- Titolo;
- Descrizione;
- Priorita'.

Il campo Appalto/Commessa/Impianto non usa opzioni mock. Le opzioni arrivano da `segnalazioni.availableScope`.

Il client invia `organizationalScope` solo quando l'utente seleziona id presenti nella risposta API. Il backend valida comunque ogni id prima della create.

Se esiste una sola opzione operativa valida, la UI la preseleziona automaticamente. Se esistono piu' opzioni, la selezione resta esplicita.

Default applicativi usati:

- `priority`: valore scelto dall'utente;
- `severity`: uguale alla priorita' iniziale scelta;
- `category`: `Sicurezza`;
- `type`: `Pericolo`.

Questi default sono temporanei e documentati per evitare campi tecnici incomprensibili nella UI operatore.

## Mock rimasti

Restano mock solo per Comunicazioni Sicurezza:

- Video;
- Circolari;
- Infografiche;
- Avvisi;
- presa visione locale.

Le Segnalazioni non usano piu' mock runtime.

## Allegati

Gli allegati non vengono ancora caricati.

Il file input e' disabilitato con messaggio:

```text
Allegati disponibili in un prossimo aggiornamento.
```

Nessun file viene inviato, salvato o caricato.

## UX

La UI gestisce:

- caricamento contesti operativi;
- empty state contesti operativi;
- errore contesti operativi con retry;
- loading lista con skeleton;
- lista vuota con messaggio neutro;
- errore lista con azione Riprova;
- submit disabilitato durante invio;
- feedback successo;
- errore create user-friendly;
- dettaglio con loading, errore e ritorno alla lista;
- commenti reali nel dettaglio;
- timeline compatta da dati persistiti;
- azioni mostrate solo secondo `capabilities`;
- presa visione idempotente lato UX;
- Comunicazioni mock invariato.

## Limiti residui

- plant usa temporaneamente i dati reali di `microclimate_sites`;
- aree operative non ancora disponibili nello schema attuale;
- AuditPort e NotificationPort restano deferred, senza outbox persistente;
- allegati reali non disponibili;
- Comunicazioni Sicurezza non hanno ancora backend;
- il runtime locale richiede che il Core Identity Context risolva un worker/persona collegato all'utente autenticato;
- `DEV_AUTH` richiede una URL MySQL locale valida e una fixture identity locale coerente con `users`, `workers`, `companies`, `sites`, `contracts` e `user_organization_scopes`.
