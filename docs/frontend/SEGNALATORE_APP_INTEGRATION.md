# SegnalatoreApp Integration

## Stato

`SegnalatoreApp` usa le API reali Segnalazioni per:

- lista segnalazioni visibili;
- creazione nuova segnalazione;
- dettaglio segnalazione.

La stessa app e' montata in:

- `/segnalazioni/app`;
- smartphone floating nella pagina `/segnalazioni`.

La pagina `/segnalazioni` usa lo stesso layer dati frontend e non mantiene piu' una lista mock di segnalazioni.

## Flusso dati

```text
SegnalatoreApp React
  -> hooks UI Segnalazioni
  -> tRPC client esistente
  -> segnalazioni.create/list/byId
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
- mapper DTO -> UI;
- builder payload create.

## Mapping form -> API

Il form mobile mantiene campi operatore:

- Titolo;
- Descrizione;
- Priorita'.

Il campo Appalto/Commessa/Impianto non usa piu' opzioni mock. Il perimetro operativo viene assegnato dal backend in base all'ActorContext.

Finche' manca una query sicura per gli appalti visibili all'attore, il client non invia `organizationalScope`. La API crea la segnalazione nel perimetro backend consentito e la `list` senza filtro esplicito non viene ristretta al primo scope operativo dell'attore, cosi' il record appena creato resta visibile.

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

- loading lista con skeleton;
- lista vuota con messaggio neutro;
- errore lista con azione Riprova;
- submit disabilitato durante invio;
- feedback successo;
- errore create user-friendly;
- dettaglio con loading, errore e ritorno alla lista;
- Comunicazioni mock invariato.

## Limiti residui

- manca una query sicura per appalti/commesse visibili all'attore;
- commenti, workflow, prese in carico e chiusure non sono ancora collegati;
- allegati reali non disponibili;
- Comunicazioni Sicurezza non hanno ancora backend;
- il runtime locale richiede che il Core Identity Context risolva un worker/persona collegato all'utente autenticato.
- `DEV_AUTH` richiede una URL MySQL locale valida e una fixture identity locale coerente con `users`, `workers`, `companies`, `sites`, `contracts` e `user_organization_scopes`.
