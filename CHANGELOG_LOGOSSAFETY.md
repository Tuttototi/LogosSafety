# Changelog LogosSafety

## 12 luglio 2026

### Admin — Anagrafiche e Utenti reali

- Aggiunto bootstrap locale idempotente dell'admin reale con persona `workers`, account `users` e scope company in `user_organization_scopes`.
- Rimosso dal login normale il doppio pulsante DEV "Admin UAT" / "Segnalatore UAT"; il DEV login locale identifica l'account admin configurato dal backend senza selezione ruolo frontend.
- Aggiunta pagina `/anagrafiche-utenti`, visibile solo ad admin, per elenco persone/account, ricerca, filtri, creazione persona senza account e abilitazione account.
- Aggiunto router tRPC `adminIdentity` con DTO Zod strict per list/detail/create/update/enable account/status/role/scope.
- Validati lato backend ruoli Core, scope company/sede/appalto/impianto e boundary company dell'admin risolto da `CoreIdentityService`.
- Auditati eventi persona/account/ruolo/scope con metadata sanitizzati senza codice fiscale completo.
- Documentata la procedura in `docs/admin/ANAGRAFICHE_UTENTI.md`.
- Nessun nuovo sistema auth, nessun bypass Core Identity, nessuna migrazione generale persons/memberships/role_assignments.

### Auth — DEV login UAT su avvio locale normale

- Allineato il caricamento server-side delle variabili locali a `.env`, `.env.local`, `.env.development` e `.env.development.local`.
- Allineato lo script `npm run uat:seed:segnalazioni` allo stesso loader, evitando il preload separato di sola `.env`.
- Aggiunta diagnostica sicura per il DEV login UAT con codici `DEV_DATABASE_UNAVAILABLE`, `DEV_UAT_FIXTURE_NOT_FOUND` e `DEV_UAT_IDENTITY_INVALID`.
- Verificato il seed UAT idempotente e il login reale Admin/Segnalatore da `npm run dev` senza override manuali di processo.

### Auth — guard login e logout UAT

- Aggiunta guard unica React per proteggere tutte le route applicative e lasciare pubblica solo `/login`.
- Corretto il logout con svuotamento cache client e redirect sostitutivo a `/login`.
- Corretto il DEV login UAT con redirect per ruolo: Admin verso `/segnalazioni`, Segnalatore verso `/segnalazioni/app`.
- Aggiunto fallback dev-only per usare `DATABASE_URL` quando `DEV_DATABASE_URL` locale punta allo stesso database ma non include credenziali complete.
- Sostituita l'icona provvisoria della pagina login con il logo reale `/assets/LogoLogos.png`.

### Segnalazioni — utenti UAT locali

- Aggiunta fixture locale idempotente per creare Admin UAT e Segnalatore UAT collegati a Core Identity.
- Esteso il DEV login con selezione identita' `admin` e `segnalatore`, disponibile solo in ambiente non production con DEV auth abilitato.
- Aggiunto script `npm run uat:seed:segnalazioni` con guard su database locale e `NODE_ENV=production`.
- Documentata la procedura di collaudo in `docs/testing/SEGNALAZIONI_UAT_USERS.md`.
- Nessun push, nessun nuovo sistema auth, nessun bypass del Core Identity Context.

### Segnalazioni — chiusura verticale MVP end-to-end

- Estesa la dashboard desktop `/segnalazioni` con filtri operativi per stato, priorita', appalto/commessa, sede, impianto, area, autore e periodo.
- Collegati i filtri principali alla query tRPC `segnalazioni.list` con validazione server-side, mantenendo la sola ricerca testuale sul dataset gia' filtrato.
- Aggiunto dettaglio operativo desktop con commenti, timeline, presa in carico, richiesta integrazione, integrazione, avanzamento stato, risoluzione, chiusura e presa visione secondo capability backend.
- Aggiunte notifiche in-app minime tramite endpoint protetto `segnalazioni.notifications`, derivate da timeline/commenti visibili senza creare un motore notifiche generico.
- Aggiornata invalidazione cache per lista, dettaglio e notifiche dopo create e mutazioni workflow.
- Documentate checklist rilascio MVP e guida utente in `docs/release/SEGNALAZIONI_RELEASE_CHECKLIST.md` e `docs/user/SEGNALAZIONI_USER_GUIDE.md`.
- Allegati reali rinviati: esistono metadati DB ma manca storage sicuro riusabile con download protetto e RBAC.
- Stato letta/non letta notifiche rinviato: l'endpoint attuale restituisce eventi derivati e non persiste letture.

### Segnalazioni — Audit Log persistente e Notification Outbox

- Sostituiti gli adapter deferred `AuditPort` e `NotificationPort` nel wiring API Segnalazioni con adapter persistenti.
- Aggiunte le tabelle Drizzle/MySQL `audit_log_entries` e `notification_outbox`.
- Generata e applicata localmente la migration `0003_volatile_human_cannonball.sql`.
- Introdotto `DrizzleTransactionCoordinator` per condividere la stessa transazione tra mutation Segnalazioni, workflow event, audit e outbox.
- Aggiunti moduli infrastrutturali `audit` e `notifications` con repository, mapping, sanitizzazione metadata e query tenant-safe.
- Definita matrice eventi audit e matrice eventi notificabili; `acknowledge` genera audit ma non outbox.
- Aggiunti test unitari per mapping/sanitizzazione e integration test MySQL reale su ciclo operativo, correlationId, ack idempotente, `findPending`, status outbox e rollback.
- Documentati ADR, Audit Log, Notification Outbox e test transazionali.
- Nessun provider email/SMS/push/WhatsApp, nessun worker outbox, nessuna UI Audit nuova.

### Segnalazioni — workflow operativo reale

- Collegate alle API tRPC le mutation operative `addComment`, `requestIntegration`, `integrate`, `takeInCharge`, `changeStatus`, `resolve`, `close` e `acknowledge`.
- Esteso il dettaglio `segnalazioni.byId` con commenti reali, timeline persistita, capability server-side e stato presa visione.
- Aggiornata `SegnalatoreApp` per mostrare azioni solo secondo capability backend, commenti, timeline e presa visione.
- Rafforzati use case Application per commenti/testi obbligatori, acknowledgement idempotente e conflict su presa in carico gia' avvenuta.
- Aggiornata la policy Domain per ruoli operativi scoped (`capo_area`, `capo_impianto`, `referente_commessa`) senza privilegi cross-tenant.
- Aggiunto integration test MySQL reale sul ciclo create -> presa in carico -> commento -> richiesta integrazione -> integrazione -> risoluzione -> presa visione -> chiusura.
- Documentato il workflow in `docs/workflows/SEGNALAZIONI_WORKFLOW.md`.
- In quel passaggio AuditPort e NotificationPort erano ancora deferred; sono stati collegati successivamente ad audit/outbox persistenti in questo stesso aggiornamento del 12 luglio.

### Core / Segnalazioni — Organizational Scope Resolver

- Aggiunto il contratto applicativo `organizational-scope` per caricare appalti/commesse, sedi, impianti e aree accessibili all'attore.
- Aggiunto repository Drizzle `DrizzleOrganizationalScopeRepository` su `contracts`, `sites` e `microclimate_sites`, filtrato da Core Identity Context e scope assegnati.
- Esposta la procedura protetta `segnalazioni.availableScope` con DTO minimali per il frontend.
- Aggiornata `segnalazioni.create` per validare lato backend gli id operativi selezionati e bloccare combinazioni appalto/sede/impianto incoerenti.
- Aggiornata `SegnalatoreApp` per rimuovere mock appalti, caricare opzioni reali, gestire loading/empty/error e inviare solo id autorizzati.
- Aggiunti test unitari, test router, test UI mapper/hook e integration test MySQL opt-in sul resolver reale.
- Documentata l'architettura in `docs/architecture/ORGANIZATIONAL_SCOPE_RESOLVER.md`.
- Nessuna modifica a schema DB, migrazioni, auth, workflow, allegati, commenti, sidebar o PHP.

## 11 luglio 2026

### Segnalazioni — SegnalatoreApp collegata alle API

- Collegata `SegnalatoreApp` alle procedure tRPC reali `segnalazioni.list`, `segnalazioni.create` e `segnalazioni.byId`.
- Aggiunto layer frontend `app/src/modules/segnalazioni/ui` con hook, mapper e builder payload.
- Rimossi i mock Segnalazioni dal runtime di `SegnalatoreApp` e della pagina `/segnalazioni`; i mock Comunicazioni restano invariati.
- Disabilitato l'upload allegati nel form con messaggio esplicito di funzionalita' futura.
- Corretto il comportamento default di `segnalazioni.list` per non restringere la lista al primo scope operativo quando la create non invia un appalto selezionabile.
- Documentata l'integrazione in `docs/frontend/SEGNALATORE_APP_INTEGRATION.md`.
- Nessuna modifica a schema DB, migrazioni, Core Identity, Domain Segnalazioni, workflow, sidebar o PHP.

### Core Identity — contesto attore backend

- Aggiunto `CoreIdentityService` backend per risolvere `ActorContext` da utente autenticato, record utente, worker/persona, azienda, ruolo e scope organizzativo.
- Aggiunto repository Drizzle dedicato su `users`, `workers`, `companies`, `user_organization_scopes`, `sites` e `contracts`.
- Esteso il contratto condiviso `ActorContext` con company, ruolo primario, stato attivo, permessi, scope aggregato e `canAccessAllTenants`.
- Sostituito l'adapter locale temporaneo di Segnalazioni con il nuovo Core Identity Context, mantenendo invariate le procedure `create`, `list` e `byId`.
- Aggiunti test unitari e integration test opt-in MySQL locale per il repository identity.
- Documentata l'architettura in `docs/architecture/CORE_IDENTITY_CONTEXT.md`.
- Nessuna modifica a UI React, routing frontend, schema DB, migrazioni o PHP.

### Segnalazioni — API tRPC backend

- Esposte le procedure backend `segnalazioni.create`, `segnalazioni.list` e `segnalazioni.byId` tramite Hono/tRPC.
- Collegati i casi d'uso applicativi Segnalazioni al repository persistente `DrizzleSegnalazioniRepository`.
- Aggiunto adapter temporaneo server-side dall'utente autenticato LogosSafety legacy a `SegnalazioniActor`, senza accettare tenant, company, ruolo o autore dal client.
- Aggiunti schema Zod strict, DTO, mapping errori applicativi verso tRPC e test Vitest sul boundary API.
- Documentata l'API in `docs/api/SEGNALAZIONI_API.md`.
- Nessuna modifica a UI React, routing frontend, PHP, database, migrazioni o autenticazione.

### Segnalazioni — validazione persistenza MySQL locale

- Avviato container Docker locale `logos-safety-mysql` con MySQL 8.4 e database `logos_safety`.
- Applicate realmente le migrazioni Drizzle locali fino a `0002_talented_omega_flight`.
- Verificate su MySQL reale le tabelle Segnalazioni, constraint unique, FK interne, indici principali e tipi colonna.
- Aggiunto test Vitest opt-in `segnalazioni-persistence.integration` sul vero `DrizzleSegnalazioniRepository`, con tenant isolation e cleanup mirato.
- Documentata la procedura in `docs/testing/SEGNALAZIONI_PERSISTENCE_TEST.md`.

### Architettura — application context

- Aggiunto `docs/architecture/APPLICATION_CONTEXT.md` con mappa moduli, ownership dati, dipendenze consentite/vietate, eventi, regole di integrazione e strategia di migrazione incrementale.
- Aggiunta l'ADR `docs/architecture/decisions/ADR-0001-application-context.md` per formalizzare Core Domain condiviso, moduli indipendenti, backend unico LogosSafety e integrazione tramite port/eventi/contratti.
- Aggiunti contratti TypeScript tecnici condivisi in `app/src/modules/shared/contracts` per `ActorContext`, `DomainEvent` ed `EntityReference`.
- Nessuna modifica a database, migrazioni, API, auth, React, routing, UI o schema Drizzle.

## 10 luglio 2026

### Core Domain — modello condiviso

- Aggiunto il Core Domain TypeScript puro per tenant, organizzazioni, persone, account, membership, ruoli, permessi, scope e role assignment.
- Aggiunte validazioni pure per persona, account, organizzazione, membership, role assignment e perimetro organizzativo.
- Documentata l'architettura in `docs/architecture/CORE_DOMAIN.md`, inclusi mapping con schema esistente, rischi e strategia di integrazione futura con Segnalazioni.
- Aggiunti test Vitest `core-domain` senza database, API o UI.

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
