# Changelog LogosSafety

## 10 luglio 2026

### Segnalazioni — persistenza Drizzle

- Aggiunte tabelle Drizzle per Segnalazioni, commenti, allegati, workflow events e prese visione.
- Generata la migrazione `0002_talented_omega_flight.sql` con snapshot Drizzle aggiornata.
- Aggiunto repository Drizzle concreto non ancora collegato a UI/API, con mapper dominio-record e filtri tenant/company nelle query di lista.
- Aggiunti test Vitest sui mapper di persistenza e validazione dei valori enum letti da database.

### Segnalazioni — application layer

- Aggiunto il livello applicativo del modulo Segnalazioni con use case, ports, errori tipizzati ed eventi applicativi.
- Definiti contratti astratti per repository, audit, notifiche, clock e generazione ID/codici senza implementazioni infrastrutturali.
- Aggiunti test Vitest puri per creazione, lista, dettaglio, presa in carico, commenti, integrazioni, transizioni, chiusura e presa visione.

### Segnalazioni — autore autenticato e perimetro organizzativo

- Consolidato il domain model Segnalazioni con autore autenticato, tenant, azienda e perimetro operativo.
- Aggiunti ruoli di dominio, policy pure di visibilita/commento/gestione e validazioni per bloccare segnalazioni anonime o cross-tenant.
- Aggiunti test puri Vitest per autore, visibilita, perimetro impianto/area, tenant, utente inattivo e ruolo sconosciuto.

## 9 luglio 2026

### Segnalazioni — domain model

- Aggiunto il modello TypeScript puro del dominio Segnalazioni sotto `app/src/modules/segnalazioni/domain`.
- Definiti tipi e interfacce per segnalazioni, commenti, allegati, comunicazioni e workflow senza dipendenze da backend, database o componenti React.
- Aggiunto il workflow ufficiale lineare delle Segnalazioni con funzioni pure per transizioni, stato aperto/chiuso ed editabilità.

### Segnalazioni — hotfix post modularizzazione

- Stabilizzati gli import della `SegnalatoreApp` modularizzata usando il path esplicito `SegnalatoreApp/index`.
- Verificato il mount di `/segnalazioni`, `/segnalazioni/app` e dello smartphone floating dopo riavvio pulito del dev server.
- Rilevata una `500` non bloccante su `branding.get`, distinta dal refactor Segnalazioni.

## 8 luglio 2026

### Segnalazioni — App segnalatore mobile in React

- Assorbita la UI statica `App_Segnalatore.html` in componenti React/TypeScript interni a LogosSafety.
- Aggiunto il frame `FloatingSmartphone` per visualizzare il flusso mobile nella pagina `/segnalazioni`.
- Aggiunta la form mobile `SegnalatoreMobileApp` con submit locale non collegato ad API o database.
- Ripristinata la voce sidebar `Segnalazioni` come route React interna `/segnalazioni`.
- Mantenuto il placeholder diagnostico `/logos_segnalazioni/index.html` come artefatto temporaneo non usato dalla sidebar.
- Migliorato lo smartphone floating con schermo bianco uniforme e drag & drop tramite Pointer Events.
- Inserito il logo reale Logos nella UI mobile segnalatore usando l'asset pubblico `/assets/LogoLogos.png`.
- Sostituito il simbolo provvisorio della sidebar con il logo reale Logos.
- Configurata la favicon reale LogosSafety tramite `/assets/favicon.ico`.
- Creata `SegnalatoreApp` React riusabile con form, tab, lista mock e azioni UI-only per ruolo.
- Aggiunta route interna `/segnalazioni/app` e collegato lo smartphone floating alla stessa App Segnalatore.
- Aggiunta tab `Comunicazioni` in `SegnalatoreApp` con mock locali e presa visione UI-only.
- Rifattorizzata `SegnalatoreApp` in componenti, hook, tipi e mock separati senza modificare il comportamento visibile.

## 24 giugno 2026

### Aziende — preparazione Import Excel

- Allineata la validazione backend dell'import Aziende alla validazione CRUD esistente.
- Resi obbligatori nel template/preview Excel i campi anagrafici richiesti dal form Aziende: indirizzo, città, provincia, CAP ed email.
- Aggiunto controllo Excel e backend per richiedere almeno uno tra Partita IVA e Codice Fiscale.
- Validati PEC e campo Cooperativa (`SI/NO`, `true/false`, `1/0`) prima dell'import.
- Migliorata la gestione duplicati Aziende su nome, Partita IVA o Codice Fiscale.
- Rimossi log console di righe e payload importati dal wizard Excel.
- Aggiunti test automatici sulla validazione dell'import Aziende.

## 19 giugno 2026

### Security — segregazione dati clinici delle visite

- Separati gli endpoint sanitari operativi dagli endpoint clinici.
- `medical.list` restituisce esclusivamente tipo visita, stato, date/scadenze e riferimenti a lavoratore, azienda, sede e mansione.
- Introdotto `medical.clinicalList` per Admin, Responsabile Sicurezza e Medico Competente.
- Separati `medical.update` operativo e `medical.updateClinical` per giudizio, limitazioni, prescrizioni, protocollo, note e allegati.
- Cancellazione e import visite limitati ai ruoli clinici.
- Rimossi i campi clinici dai DTO `workers.getById` e `compliance.checkWorker`.
- Aggiornata la Sorveglianza Sanitaria per caricare i dati clinici solo per i ruoli autorizzati.
- Nascosto l'import visite ai ruoli non clinici.
- Aggiunti test RBAC sulla policy e sugli endpoint clinici.

### Security — protezione contenuti documentali sensibili

- `documents.list` restituisce esclusivamente metadati e non include più `fileUrl`, base64 o contenuto del file.
- Introdotto `documents.access`, endpoint backend dedicato per apertura e download.
- Ogni accesso verifica nuovamente ruolo e classificazione del documento lato backend.
- Documenti sanitari accessibili solo ad Admin, Responsabile Sicurezza e Medico Competente.
- Documenti di identità e patenti accessibili solo ad Admin e Responsabile Sicurezza.
- Aperture e download registrati nell'audit log con azioni `view` e `download`.
- Aggiornata la pagina Documenti per recuperare il contenuto solo al momento dell'accesso.
- Aggiunti test automatici della matrice autorizzativa documentale.

### Security — rimozione vulnerabilità SheetJS in produzione

- Aggiornata la dipendenza `xlsx` dalla versione npm `0.18.5` a SheetJS CE `0.20.3`, distribuita dal CDN ufficiale SheetJS.
- Mantenute invariate le API di import/export e il supporto ai file `.xlsx` e `.xls`.
- Verificate lettura dei workbook campione e generazione/lettura di un export in memoria.
- `npm audit --omit=dev` non rileva più vulnerabilità.
- Nessuna modifica al codice applicativo.

## 18 giugno 2026

### Security — revoca sessioni legacy e protezione artefatti

- Ruotato il formato di sessione a `logos_sid_v2`.
- Introdotta la versione obbligatoria delle sessioni (`version: 2`), invalidando tutti i JWT precedenti, incluso il token esposto nel repository.
- Aggiunti issuer, audience, identificatore univoco `jti` e durata massima di 12 ore ai nuovi token.
- Bloccata l'autenticazione degli utenti disattivati.
- Il login e il logout eliminano anche il cookie legacy `kimi_sid`.
- Rimosso `app/cookiejar.txt` dal working tree.
- Aggiunti pattern `.gitignore` per cookie jar e artefatti di sessione.
- Aggiunto il gate `npm run security:secrets`, eseguito automaticamente da `npm run check`.
- Aggiunti test automatici per token correnti, token legacy e audience non valida.

### Note operative

- La cronologia Git locale contiene ancora il file nel commit iniziale `6f88fc3`.
- La riscrittura della history e l'eventuale aggiornamento del repository remoto devono essere eseguiti in un task Git dedicato e coordinato; nessun remote è configurato nel checkout corrente.
