# PROJECT AUDIT — LOGOSSAFETY

**Data audit:** 18 giugno 2026  
**Ultimo aggiornamento sicurezza dipendenze:** 19 giugno 2026  
**Repository applicativo:** `app/`  
**Commit analizzato:** `be966fa` (`master`)  
**Metodo:** analisi statica completa del repository, cronologia Git, schema e migration, type-check non scrivente, lint non scrivente, audit dipendenze npm e tentativo di connessione read-only al database configurato.

## Aggiornamento operativo — 24 giugno 2026

Per il modulo Aziende è stata preparata una versione più solida dell'Import Excel:

- validazione backend import allineata al CRUD Aziende;
- template e preview Excel aggiornati con indirizzo, città, provincia, CAP ed email obbligatori;
- controllo cross-field per richiedere almeno uno tra Partita IVA e Codice Fiscale;
- validazione opzionale di PEC e Cooperativa;
- gestione duplicati estesa a nome, Partita IVA e Codice Fiscale;
- rimozione dei log console di righe/payload importati nel wizard;
- aggiunti test automatici dedicati alla validazione Aziende.

Rimangono aperti i limiti strutturali già censiti: assenza di transazioni batch, assenza di registro persistente import batch/righe, assenza di vincoli univoci DB su Aziende e assenza di scope organizzativi.

## Perimetro e limitazioni dell'audit

- Il working tree di `app/` era pulito prima dell'audit.
- Il type-check di frontend, backend e configurazione Node è terminato senza errori.
- Il lint è terminato con **66 errori**.
- Non risultano test Vitest `*.test.ts` o `*.spec.ts`; gli script presenti sono test manuali che scrivono sul database.
- La connessione read-only al database configurato è fallita con `ECONNREFUSED` su `localhost:3306`; non è stato quindi possibile attestare schema applicato, dati, consistenza o performance del database reale.
- La build non è stata rieseguita perché avrebbe modificato `dist/`, in contrasto con il vincolo di non modificare altri file.
- Le percentuali sono stime ingegneristiche di completezza e readiness, non certificazioni normative.

# 1. Executive Summary

## Stato generale del progetto

LogosSafety è un **prototipo applicativo avanzato / alpha funzionale**, con:

- frontend React esteso e graficamente coerente;
- backend Hono + tRPC con 48 procedure;
- schema MySQL ampio, composto da 25 tabelle;
- migration iniziale e dati seed;
- funzioni reali per consultazione dati, CRUD Aziende, import di 5 entità, export parziali, documenti e audit;
- moduli Microclima, Notifiche e OT23 predisposti nello schema ma non collegati a servizi backend reali.

Il progetto non è attualmente pronto per gestire in produzione dati reali di sicurezza sul lavoro e, soprattutto, dati sanitari. I principali blocchi sono sicurezza, autorizzazioni, integrità dati, gestione documentale, test, operatività del database e presenza di funzionalità simulate o non collegate.

## Valutazione complessiva

**Valutazione: 39/100 — non pronto per produzione.**

Punti positivi:

- stack moderno e coerente;
- separazione frontend/backend/contratti/database comprensibile;
- type-check pulito;
- base dati ricca;
- buone fondamenta UI;
- primo modulo Aziende sostanzialmente utilizzabile in ambiente controllato;
- audit helper e soft delete presenti in alcune aree.

Blocchi critici:

- `app/cookiejar.txt` versionato contiene un cookie di sessione `kimi_sid` con scadenza futura;
- RBAC incoerente con i ruoli dichiarati e privo di scope azienda/sede/commessa;
- dati clinici delle visite segregati per ruolo dal 19 giugno 2026; restano assenti scope organizzativi, retention e altri controlli privacy;
- audit npm di produzione a zero vulnerabilità dopo l'aggiornamento a SheetJS CE `xlsx@0.20.3`;
- restano 4 vulnerabilità moderate esclusivamente nella toolchain di sviluppo `drizzle-kit`/`esbuild`;
- assenza di test automatizzati e CI/CD;
- database configurato non disponibile durante l'audit;
- quasi tutte le relazioni core sono prive di Foreign Key reali;
- documenti memorizzati come base64 nel database;
- Microclima, Notifiche e OT23 sono prevalentemente mock o solo schema;
- numerosi pulsanti frontend non eseguono alcuna operazione.

## Livello di maturità del prodotto

| Dimensione | Livello |
|---|---|
| Product discovery/UI | Medio |
| Architettura applicativa | Medio-basso |
| Funzioni core | Parziale |
| Qualità e test | Basso |
| Sicurezza e privacy | Critico |
| Operatività/DevOps | Basso |
| Maturità complessiva | **Alpha / prototipo funzionale** |

# 2. Architettura

## Stack tecnologico

| Area | Tecnologie |
|---|---|
| Frontend | React 19, TypeScript 5.9, Vite 7, React Router 7, Tailwind CSS 3, shadcn/Radix UI |
| Stato e API client | TanStack Query, tRPC React |
| Backend | Hono, tRPC 11, Node.js, Zod |
| Database | MySQL, mysql2, Drizzle ORM/Kit |
| Autenticazione | OAuth 2.0 Kimi, JWT HS256 in cookie HttpOnly |
| Import/export | SheetJS `xlsx` |
| Documenti | Data URL/base64 nel DB; SDK AWS S3 installato ma non usato |
| Build | Vite frontend + esbuild backend |
| Qualità | TypeScript, ESLint, Prettier, Vitest configurato ma senza test |

## Struttura repository

```text
LogosSafety/
├─ app/                         repository Git applicativo
│  ├─ src/                     frontend: 81 file, circa 12.595 righe
│  ├─ api/                     backend: 25 file, circa 1.913 righe
│  ├─ db/                      schema, relations, seed, migration
│  ├─ contracts/               tipi e costanti condivisi
│  ├─ scripts/                 generatori/test manuali Excel
│  ├─ dist/                    artefatti locali ignorati
│  └─ package.json
├─ REPORT_ANALISI.md
├─ SPRINT_1_AZIENDE.md
├─ test_import.xlsx
└─ preview_*.png
```

Osservazioni:

- Il vero repository Git è `app/`, non la directory radice.
- Il lockfile radice non descrive l'applicazione e contiene un package vuoto con nome storico.
- `src/components/AuthLayout.tsx` e `src/pages/Home.tsx` risultano boilerplate non utilizzato dal routing corrente.
- La cronologia contiene solo 6 commit ed è fortemente concentrata nel commit iniziale.

## Frontend

Punti presenti:

- routing per 11 pagine applicative;
- layout responsive, branding, tabelle, filtri e dashboard;
- integrazione tRPC;
- import wizard Excel;
- export client-side;
- moduli consultivi per lavoratori, formazione, sorveglianza, mansioni, scadenze, documenti e audit.

Limiti:

- nessuna route guard centralizzata;
- quasi nessuna azione viene nascosta in base al ruolo;
- molte CTA sono prive di handler;
- gestione errori API limitata;
- assenza di paginazione;
- export con mapping errato su oggetti annidati;
- Microclima completamente basato su costanti mock;
- il riepilogo formazione dei lavoratori è hardcoded;
- il contatore “Scadenze prossime” somma due volte lo stesso valore (`src/pages/Dashboard.tsx:113`);
- la ricerca globale della topbar non ha effetto applicativo.

## Backend

Punti presenti:

- router tRPC distinti per dominio;
- validazione Zod;
- middleware autenticazione e ruoli;
- helper centralizzato di audit;
- soft delete per alcune entità;
- query Drizzle con relazioni.

Limiti:

- autorizzazione costruita prevalentemente come gerarchia numerica, non come matrice permessi;
- `medicoQuery`, `healthDataExportQuery`, `referenteQuery` e `adminQuery` sono definiti ma mai usati;
- nessun tenant/data scope per azienda, sede o commessa;
- nessun servizio Microclima, Notifiche o OT23;
- assenza di transazioni nelle operazioni multi-step e negli import;
- assenza di job scheduler per aggiornare scadenze e generare alert;
- nessun rate limiting o hardening HTTP esplicito;
- nessuna paginazione consistente;
- audit e mutation non sono atomici.

## Database

Punti presenti:

- 25 tabelle;
- indici sui principali filtri;
- una migration SQL completa;
- snapshot e journal Drizzle;
- relazioni ORM per i domini principali;
- Foreign Key per Microclima, Notifiche e OT23.

Limiti:

- il database configurato non era avviato/raggiungibile;
- solo 10 Foreign Key reali, tutte concentrate nei moduli più recenti;
- i domini core — lavoratori, aziende, sedi, formazione, sanitario, documenti, alert e audit — non hanno integrità referenziale DB;
- la migration è monolitica e non rappresenta l'evoluzione incrementale del prodotto;
- `.gitignore:33` ignora `db/migrations/*.sql`, quindi future migration possono non essere versionate;
- gli script seed non hanno protezione contro l'esecuzione in produzione;
- `clear-and-seed.ts` elimina dati senza controllo ambiente.

# 3. Moduli

## Riepilogo

| Modulo | Completamento | Classificazione |
|---|---:|---|
| Autenticazione | 40% | Parziale |
| Autorizzazioni e ruoli | 25% | Parziale |
| Dashboard | 48% | Parziale |
| Aziende | 72% | Utilizzabile |
| Sedi | 52% | Parziale |
| Lavoratori | 48% | Parziale |
| Mansioni e rischi | 35% | Parziale |
| Formazione | 42% | Parziale |
| Sorveglianza sanitaria | 35% | Parziale |
| Scadenziario e compliance | 43% | Parziale |
| Documentale | 32% | Parziale |
| Import/Export | 42% | Parziale |
| Audit Log | 38% | Parziale |
| Microclima | 18% | Parziale |
| Notifiche | 8% | Non iniziato |
| OT23 | 10% | Non iniziato |
| Configurazioni e branding | 45% | Parziale |
| Commesse e reparti | 8% | Non iniziato |

Nessun modulo soddisfa oggi i criteri “Pronto per produzione”.

## Autenticazione — 40% — Parziale

**Descrizione:** login OAuth Kimi, callback backend, cookie di sessione JWT e logout.

**File:** `src/pages/Login.tsx`, `src/hooks/useAuth.ts`, `api/kimi/auth.ts`, `api/kimi/session.ts`, `api/auth-router.ts`, `api/context.ts`.

**Presente:**

- authorization code exchange;
- verifica firma del token Kimi via JWKS;
- upsert utente;
- cookie HttpOnly/Secure fuori localhost;
- route dev-login esclusa quando `NODE_ENV=production`;
- logout applicativo.

**Mancante/incompleto:**

- `state` OAuth è solo il redirect URI codificato in base64, non un nonce anti-CSRF;
- mancata verifica esplicita di issuer, audience e corrispondenza `client_id`;
- sessione valida un anno, senza rotazione, revoca, `jti` o session store;
- `users.active` non viene controllato in autenticazione;
- login/logout non vengono registrati nell'audit;
- cookie di sessione reale versionato nel repository;
- assenza di MFA e policy sessione configurabili.

## Autorizzazioni e ruoli — 25% — Parziale

**Descrizione:** controllo accesso alle procedure tRPC.

**File:** `api/middleware.ts`, `src/components/layout/AppLayout.tsx`, `db/schema.ts`.

**Presente:**

- 7 ruoli;
- middleware per ruolo minimo ed elenco ruoli esatti;
- Audit Log visibile solo a ruoli selezionati.

**Mancante/incompleto:**

- la gerarchia blocca `referente_commessa`, `auditor` e `sola_lettura` dalla maggior parte delle letture;
- il dominio sanitario usa ora policy esplicite operative e cliniche, fuori dalla gerarchia numerica;
- l'operatore riceve solo il DTO operativo e non può leggere, aggiornare, eliminare o importare dati clinici;
- il menu mostra quasi tutti i moduli a tutti gli utenti;
- Import/Export è mostrato anche a ruoli che il backend rifiuta;
- nessuna amministrazione utenti/ruoli;
- nessuno scope per azienda, sede, lavoratore o commessa;
- nessuna separazione tra permessi read/create/update/delete/export.

## Dashboard — 48% — Parziale

**Descrizione:** KPI, matrice conformità e prossime scadenze.

**File:** `src/pages/Dashboard.tsx`, `api/dashboard-router.ts`, `src/lib/status-utils.ts`.

**Presente:**

- KPI da database;
- matrice lavoratore/formazione/visita;
- filtri e ricerca;
- elenco alert e scadenze.

**Mancante/incompleto:**

- accessibile solo a responsabile sicurezza e admin;
- compliance formazione hardcoded su sei codici corso, invece di usare sempre i requisiti della mansione;
- conteggio scadenze prossime errato;
- pulsante Export non collegato;
- nessun drill-down affidabile tramite query string nella pagina Dipendenti;
- nessun filtro azienda/sede/commessa;
- stato certificati dipende da valori persistiti potenzialmente non aggiornati.

## Aziende — 72% — Utilizzabile

**Descrizione:** anagrafica aziende.

**File:** `src/pages/Impostazioni.tsx`, `api/settings-router.ts`, `api/import-router.ts`, `db/schema.ts`, `src/lib/excel/import.ts`.

**Presente:**

- lista;
- create/update;
- soft delete;
- import Excel;
- export Excel;
- audit delle operazioni;
- visualizzazione sedi collegate.

**Mancante/incompleto:**

- nessun vincolo univoco su P.IVA, codice fiscale o nome;
- duplicati import basati solo sul nome esatto;
- nessun controllo su aziende con sedi/lavoratori attivi prima del soft delete;
- nessuna pagina dettaglio;
- validazione fiscale limitata;
- nessuna paginazione;
- audit update non registra diff campo per campo.

## Sedi — 52% — Parziale

**Descrizione:** sedi operative associate alle aziende.

**File:** `src/pages/Impostazioni.tsx`, `api/settings-router.ts`, `api/import-router.ts`, `db/schema.ts`.

**Presente:**

- lista;
- delete soft;
- import/export;
- API create/update/delete;
- audit backend.

**Mancante/incompleto:**

- UI create/edit esplicitamente non implementata (`src/pages/Impostazioni.tsx:170-174`);
- nessuna FK core `sites.company_id -> companies.id`;
- nessun vincolo univoco azienda/codice o azienda/nome;
- nessuna gestione responsabili, contatti o stato operativo;
- nessun controllo dipendenze prima della disattivazione.

## Lavoratori — 48% — Parziale

**Descrizione:** anagrafica lavoratori e scheda riassuntiva.

**File:** `src/pages/Dipendenti.tsx`, `api/workers-router.ts`, `db/schema.ts`, `db/relations.ts`.

**Presente:**

- lista, ricerca e filtro stato;
- dettaglio con formazione e visite;
- API create/update/soft delete;
- audit mutation;
- export Excel.

**Mancante/incompleto:**

- pulsanti Aggiungi, Modifica e Richiedi visita non collegati;
- riepilogo formazione hardcoded (`src/pages/Dipendenti.tsx:54`);
- export usa campi piatti inesistenti per mansione/azienda/sede e produce colonne vuote;
- nessuna validazione robusta/unicità del codice fiscale;
- nessuna gestione completa di commessa, reparto e storico mansione;
- nessuna UI per cessazione/riattivazione;
- nessun controllo scope per referente;
- nessuna paginazione.

## Mansioni e rischi — 35% — Parziale

**Descrizione:** matrice mansioni, rischi, formazione richiesta e obbligo sanitario.

**File:** `src/pages/Mansioni.tsx`, `src/pages/Impostazioni.tsx`, `api/settings-router.ts`, `db/schema.ts`, `db/relations.ts`.

**Presente:**

- lettura mansioni;
- associazioni rischi/formazione;
- livelli rischio e obbligo visita.

**Mancante/incompleto:**

- nessun CRUD backend per mansioni, rischi e associazioni;
- pulsanti “Nuova mansione” e “Nuovo rischio” non collegati;
- import Mansioni dichiarato ma non implementato;
- nessun export;
- conteggio lavoratori per mansione placeholder;
- nessun versionamento dei requisiti normativi.

## Formazione — 42% — Parziale

**Descrizione:** corsi, tipologie e attestati.

**File:** `src/pages/Formazione.tsx`, `api/training-router.ts`, `db/schema.ts`, `api/import-router.ts`.

**Presente:**

- lista corsi, attestati e tipologie;
- filtri;
- API creazione corso/attestato;
- import attestati;
- export attestati;
- audit sulle creazioni.

**Mancante/incompleto:**

- pulsante Nuovo corso non collegato;
- nessuna UI di creazione attestato;
- nessun update/delete di corsi e attestati;
- import Corsi dichiarato ma non implementato;
- export attestati usa numerosi campi piatti non presenti e produce dati incompleti;
- `hasFinalVerification` è accettato dall'API ma non esiste nello schema;
- nessun calcolo automatico affidabile dello stato alla data corrente;
- nessuna gestione partecipanti, convocazioni, presenze o rinnovi.

## Sorveglianza sanitaria — 35% — Parziale

**Descrizione:** visite, giudizi, prescrizioni, limitazioni e prossime scadenze.

**File:** `src/pages/Sorveglianza.tsx`, `api/medical-router.ts`, `db/schema.ts`, `api/compliance-router.ts`.

**Presente:**

- lista operativa con DTO ridotto per Admin, Responsabile, Operatore e Medico;
- lista clinica separata per Admin, Responsabile e Medico;
- API operative create/update separate dalle mutation cliniche;
- import visite limitato ai ruoli clinici;
- visualizzazione limitazioni ed export disponibili solo dopo autorizzazione backend;
- audit delle consultazioni cliniche;
- dati clinici rimossi da `workers.getById` e dal DTO di `compliance.checkWorker`.

**Mancante/incompleto:**

- pulsante Richiedi visita non collegato;
- nessuna UI modifica/completamento visita;
- cancellazione fisica delle visite;
- export ancora generato client-side, anche se i dati sorgente sono protetti dal backend;
- nessuno scope azienda/sede/commessa sulle visite;
- nessuna retention sanitaria o cifratura applicativa;
- mutation cliniche presenti ma senza UI dedicata;
- nessuna gestione protocollo sanitario versionato.

## Scadenziario e compliance — 43% — Parziale

**Descrizione:** scadenze formative/sanitarie, alert e valutazione assegnabilità.

**File:** `src/pages/Scadenziario.tsx`, `api/compliance-router.ts`, `api/dashboard-router.ts`, `db/schema.ts`.

**Presente:**

- scadenze attestati e visite;
- alert aperti;
- check compliance lavoratore;
- API risoluzione alert;
- export scadenziario.

**Mancante/incompleto:**

- parametro giorni applicato alle visite ma non realmente a tutte le scadenze formative;
- stati attestati dipendono da valori salvati, senza job di ricalcolo;
- nessun motore di generazione automatica degli alert;
- nessuna UI per risolvere alert;
- export contiene mapping a campi non presenti (`item`, `daysUntil`);
- documenti in scadenza non inclusi;
- nessuna escalation o assegnazione responsabile.

## Documentale — 32% — Parziale

**Descrizione:** caricamento, elenco, apertura e download allegati.

**File:** `src/pages/Documenti.tsx`, `api/document-router.ts`, `db/schema.ts`.

**Presente:**

- upload fino a 10 MB;
- lista e filtri;
- apertura/download tramite endpoint backend dedicato;
- associazioni logiche a entità;
- API soft delete;
- audit create/delete/view/download;
- lista limitata ai metadati, senza `fileUrl` o contenuto base64;
- accesso ai documenti sanitari limitato ad Admin, Responsabile Sicurezza e Medico Competente;
- accesso ai documenti di identità limitato ad Admin e Responsabile Sicurezza.

**Mancante/incompleto:**

- file memorizzati come Data URL/base64 nel database;
- AWS S3 installato ma non usato;
- nessun antivirus, content sniffing, allowlist MIME o hash;
- upload UI sempre come documento generale, senza metadati completi;
- nessuna UI delete/update/versioning;
- nessun bucket privato o URL firmato;
- nessuno scope azienda/sede/commessa sui documenti;
- documenti ordinari ancora visibili a qualsiasi utente autenticato;
- autorizzazioni documentali basate su ruoli hardcoded, in attesa della matrice permessi centralizzata;
- nessuna retention, cifratura applicativa o gestione GDPR;
- limite globale body 50 MB, superiore al limite documento e soggetto a pressione memoria.

## Import/Export — 42% — Parziale

**Descrizione:** wizard Excel, template, validazione e gestione duplicati.

**File:** `src/pages/ImportExport.tsx`, `src/lib/excel/import.ts`, `api/import-router.ts`, `scripts/run_import_tests.js`.

**Presente:**

- wizard upload/preview/risultato;
- template per 8 tipi;
- import effettivo di Aziende, Sedi, Dipendenti, Attestati e Visite;
- strategie ignora/aggiorna/blocca;
- file errori;
- audit riepilogativo.

**Mancante/incompleto:**

- Mansioni, Corsi e Commesse mostrati in UI ma non implementati;
- nessuna transazione batch;
- “Blocca” non garantisce rollback atomico;
- date validate in formato italiano ma inviate al DB senza normalizzazione SQL;
- match lavoratori per nome/cognome negli import sanitari/formativi, quindi ambiguo;
- duplicati dipendenti senza codice fiscale non rilevati;
- frontend usa cast `any` per i payload;
- log console espongono righe e payload potenzialmente contenenti PII/sanitari;
- nessuna tabella import batch/righe/errori;
- nessun limite al numero di righe;
- test import manuale con credenziali DB hardcoded.

## Audit Log — 38% — Parziale

**Descrizione:** tracciamento azioni applicative.

**File:** `api/middleware.ts`, `api/audit-router.ts`, `src/pages/AuditLog.tsx`, `db/schema.ts`.

**Presente:**

- tabella audit;
- helper centralizzato;
- filtri per azione/modulo/data;
- audit su parte di create/update/delete/import/export.

**Mancante/incompleto:**

- login, logout, view e download non registrati;
- IP address previsto ma mai popolato;
- old/new value quasi sempre assenti;
- nessuna immutabilità, firma, retention o esportazione;
- audit e operazione business non sono nella stessa transazione;
- se `logAudit` fallisce, il dato può essere già cambiato;
- nessuna paginazione/cursor;
- nessun audit amministrazione ruoli perché tale funzione non esiste.

## Microclima — 18% — Parziale

**Descrizione:** monitoraggio temperature/WBGT, allerte caldo/freddo e storico.

**File:** `src/pages/Microclima.tsx`, `db/schema.ts`, `db/relations.ts`, `db/seed.ts`, migration.

**Presente:**

- UI completa a livello dimostrativo;
- tabelle per sedi, rilevazioni e alert;
- relazioni e FK;
- seed demo.

**Mancante/incompleto:**

- tutti i dati frontend sono mock (`src/pages/Microclima.tsx:82`);
- nessun router/API;
- nessuna acquisizione meteo/sensori;
- nessun calcolo WBGT backend;
- nessuna configurazione soglie;
- nessuna persistenza delle azioni UI;
- Segna risolta, Documenta OT23 ed Export non funzionano;
- nessun job periodico o monitoraggio qualità sensore.

## Notifiche — 8% — Non iniziato

**Descrizione:** invio email/SMS/push/webhook per alert.

**File:** `db/schema.ts`, `db/relations.ts`, `db/seed.ts`, sezione mock in `src/pages/Microclima.tsx`.

**Presente:**

- sola tabella `notification_logs`;
- enum canale/stato;
- mock UI descrittivo.

**Mancante:**

- provider email/SMS/push;
- regole, destinatari, template e preferenze;
- API;
- outbox, retry, idempotenza e dead-letter;
- scheduler;
- tracciamento consegna reale;
- consenso e gestione contatti.

## OT23 — 10% — Non iniziato

**Descrizione:** evidenze e conformità per interventi OT23.

**File:** `db/schema.ts`, `db/relations.ts`, `db/seed.ts`, card mock in `src/pages/Microclima.tsx`.

**Presente:**

- tabella di stato annuale per azienda;
- collegamento opzionale a sede/documento;
- testo dimostrativo in UI.

**Mancante:**

- router/API;
- pagina e workflow dedicati;
- catalogo interventi/evidenze/checklist;
- approvazioni e responsabilità;
- generazione dossier/report;
- export;
- storico revisioni;
- collegamento reale con alert e azioni Microclima.

## Configurazioni e branding — 45% — Parziale

**Descrizione:** aziende/sedi, mansioni, rischi, tipologie formazione e personalizzazione grafica.

**File:** `src/pages/Impostazioni.tsx`, `src/components/settings/BrandingPanel.tsx`, `api/settings-router.ts`, `api/branding-router.ts`.

**Presente:**

- branding persistente;
- colori, logo, favicon e nome applicazione;
- lettura cataloghi;
- CRUD Aziende;
- parte Sedi.

**Mancante/incompleto:**

- CRUD mansioni/rischi/tipologie formazione;
- UI create/update sedi;
- gestione utenti/ruoli;
- configurazione notifiche/scadenze/soglie;
- validazione dimensione/tipo di logo e favicon;
- base64 nel DB anche per asset branding;
- nessun versioning o rollback configurazioni.

## Commesse e reparti — 8% — Non iniziato

**Descrizione:** commesse, reparti e assegnazione lavoratori.

**File:** `db/schema.ts`, `src/lib/excel/import.ts`.

**Presente:**

- tabelle `contracts` e `departments`;
- campi FK logici nei lavoratori;
- template import Commesse.

**Mancante:**

- relazioni ORM complete;
- Foreign Key;
- router/API;
- UI;
- CRUD/import/export reali;
- scope del referente commessa;
- storico assegnazioni.

# 4. Database

## Tabelle esistenti

| Tabella | Uso applicativo attuale | Relazioni principali |
|---|---|---|
| `users` | Autenticazione | audit/notification logici |
| `companies` | Attivo | sites, workers, microclimate, OT23 |
| `sites` | Parziale | company, workers, microclimate, OT23 |
| `contracts` | Inutilizzata | company/site/workers solo logici |
| `departments` | Inutilizzata | company/site/workers solo logici |
| `job_roles` | Lettura | workers, risks, training |
| `risks` | Lettura | job_role_risks |
| `job_role_risks` | Lettura | job_roles/risks |
| `training_types` | Lettura | job roles/courses |
| `job_role_training` | Lettura/compliance | job roles/training types |
| `workers` | Attivo | company/site/contract/department/job role |
| `worker_job_history` | Inutilizzata | worker e mansioni/aziende logiche |
| `training_courses` | Attivo parziale | training type/certificates |
| `training_certificates` | Attivo | worker/course |
| `medical_visits` | Attivo parziale | worker |
| `documents` | Attivo parziale | worker/entità polimorfica |
| `alerts` | Lettura/resolve | worker |
| `microclimate_sites` | Solo seed/schema | company/site |
| `microclimate_readings` | Solo seed/schema | microclimate site |
| `microclimate_alerts` | Solo seed/schema | site/reading/notifications |
| `notification_logs` | Solo seed/schema | user/microclimate alert |
| `ot23_compliance` | Solo seed/schema | company/site/document |
| `non_conformities` | Inutilizzata | worker solo logico |
| `audit_logs` | Attivo parziale | user solo logico |
| `branding` | Attivo | singleton applicativo |

## Relazioni e Foreign Key

Le relazioni ORM coprono buona parte del dominio, ma le Foreign Key reali sono solo 10:

1. `microclimate_sites.company_id -> companies.id`
2. `microclimate_sites.site_id -> sites.id`
3. `microclimate_readings.microclimate_site_id -> microclimate_sites.id`
4. `microclimate_alerts.microclimate_site_id -> microclimate_sites.id`
5. `microclimate_alerts.microclimate_reading_id -> microclimate_readings.id`
6. `notification_logs.user_id -> users.id`
7. `notification_logs.microclimate_alert_id -> microclimate_alerts.id`
8. `ot23_compliance.company_id -> companies.id`
9. `ot23_compliance.site_id -> sites.id`
10. `ot23_compliance.document_id -> documents.id`

Relazioni core senza FK:

- lavoratore → azienda/sede/commessa/reparto/mansione;
- attestato → lavoratore/corso;
- corso → tipologia;
- visita → lavoratore;
- documento → lavoratore;
- alert → lavoratore;
- mapping mansione/rischio/formazione;
- audit → utente;
- storico mansione → lavoratore/mansioni/aziende.

Conseguenze:

- record orfani;
- soft delete incoerenti;
- impossibilità di affidarsi al DB per integrità;
- race condition negli import;
- cancellazioni e aggiornamenti non protetti.

## Migration

**Presente:** `db/migrations/0000_sprint2_initial.sql`, 489 righe, con tutte le 25 tabelle.

Problemi:

- una sola migration monolitica;
- nessuna rollback strategy;
- future migration SQL ignorate da `.gitignore`;
- nessuna prova di applicazione su database pulito;
- database reale non raggiungibile durante l'audit;
- commento schema dichiara FK applicative, mentre solo i moduli recenti hanno FK vere;
- modalità Drizzle `planetscale` usata con una configurazione MySQL locale e FK parziali: va validata esplicitamente.

## Tabelle inutilizzate

Completamente prive di API/UI reale:

- `contracts`
- `departments`
- `worker_job_history`
- `microclimate_sites`
- `microclimate_readings`
- `microclimate_alerts`
- `notification_logs`
- `ot23_compliance`
- `non_conformities`

## Tabelle mancanti consigliate

- `auth_sessions` / revoche sessione;
- `user_scopes` o mapping utente-azienda/sede/commessa;
- matrice `roles`, `permissions`, `role_permissions` se i ruoli devono essere configurabili;
- `import_batches` e `import_rows`;
- `notification_rules`, `notification_recipients`, `notification_templates`;
- `document_versions` e metadati storage;
- `microclimate_sensors`, `microclimate_thresholds`;
- `ot23_interventions`, `ot23_evidence`, `ot23_approvals`;
- `scheduled_jobs`/outbox se non gestiti da infrastruttura esterna;
- storico/versioni dei requisiti formativi e sanitari.

# 5. API

## Endpoint esistenti

Sono presenti **48 procedure tRPC**: 24 query e 24 mutation.

| Router | Procedure |
|---|---|
| Root | `ping` |
| Auth | `auth.me`, `auth.logout` |
| Dashboard | `dashboard.stats`, `dashboard.complianceMatrix`, `dashboard.upcomingDeadlines` |
| Workers | `workers.list`, `workers.getById`, `workers.create`, `workers.update`, `workers.delete` |
| Training | `training.types`, `training.courses`, `training.certificates`, `training.createCourse`, `training.createCertificate` |
| Medical | `medical.list`, `medical.create`, `medical.update`, `medical.delete` |
| Compliance | `compliance.checkWorker`, `compliance.alerts`, `compliance.resolveAlert`, `compliance.scadenziario` |
| Settings | `companies`, `createCompany`, `updateCompany`, `deleteCompany`, `exportCompanies`, `sites`, `createSite`, `updateSite`, `deleteSite`, `exportSites`, `jobRoles`, `risks`, `trainingTypes` |
| Branding | `branding.get`, `branding.upsert` |
| Documents | `documents.list`, `documents.create`, `documents.delete` |
| Audit | `audit.list` |
| Import | `importCompanies`, `importSites`, `importWorkers`, `importCertificates`, `importVisits` |

Distribuzione autorizzazioni:

- 2 procedure pubbliche;
- 3 per qualsiasi autenticato;
- 4 per responsabile sicurezza/admin;
- 38 per operatore o livello superiore;
- 1 per auditor/admin/responsabile.

## Endpoint mancanti

- utenti, ruoli, attivazione/disattivazione e scope;
- commesse e reparti;
- CRUD mansioni, rischi e mapping;
- update/delete corsi e attestati;
- export sanitario server-side autorizzato;
- versionamento documenti e download tramite storage privato/URL firmate;
- generazione automatica alert;
- Microclima completo;
- Notifiche completo;
- OT23 completo;
- non conformità;
- import Mansioni/Corsi/Commesse;
- export server-side coerenti;
- health/readiness endpoint con verifica DB;
- metriche e diagnostica operativa.

## Endpoint incompleti o problematici

- `medical.*`: separazione operativo/clinico applicata; restano scope organizzativi e UI clinica;
- `documents.list`: ora metadata-only e filtra sanitario/identità, ma resta privo di scope azienda/sede/commessa;
- `dashboard.*`: autorizzazione troppo restrittiva rispetto alla UI;
- `training.createCourse`: input non allineato allo schema;
- `compliance.scadenziario`: filtro giorni incompleto;
- import: nessuna transazione e normalizzazione date insufficiente;
- audit: limite privo di massimo e nessuna paginazione;
- list principali: nessuna paginazione;
- `branding.get`: pubblico e potenzialmente restituisce asset base64 molto grandi;
- errori business sollevati spesso come `Error` generico, senza codici coerenti.

# 6. Sicurezza

## Login

Stato: **parziale e non production-ready**.

Finding:

- **Critico:** cookie sessione versionato in `app/cookiejar.txt`;
- OAuth `state` non protegge da CSRF;
- sessione JWT di un anno;
- nessuna revoca server-side;
- nessun controllo `active`;
- claim Kimi non validati completamente;
- nessun rate limit su login/callback/dev-login;
- fallback secret di sviluppo noto nel codice;
- assenza di audit login/logout.

## Ruoli e permessi

Stato: **incoerente**.

- Il modello gerarchico non rappresenta i permessi reali.
- `medico_competente` può accedere ai dati operativi e clinici.
- `operatore_sicurezza` accede esclusivamente a tipo, stato, date/scadenze e anagrafica organizzativa della visita.
- `sola_lettura` non può leggere quasi nulla.
- `referente_commessa` non ha scope commessa.
- `auditor` vede solo l'audit ma la UI mostra altri moduli.
- Non esiste amministrazione utenti.
- Il least privilege documentale è applicato alle categorie sanitarie e identità, ma non ancora agli scope organizzativi.

## Audit

Stato: **parziale**.

- copertura non completa;
- nessuna immutabilità;
- nessun IP;
- apertura/download documenti e consultazioni cliniche sono auditati; restano non auditati altri accessi sensibili;
- assenza di transazioni con l'operazione business;
- nessuna retention o esportazione probatoria.

## Vulnerabilità rilevate

### Critiche/bloccanti

1. Cookie di sessione versionato e potenzialmente riutilizzabile.
2. Nessuno scope multi-azienda/sede/commessa.
3. Database core privo di integrità referenziale.

### Dipendenze

Audit npm aggiornato al 19 giugno 2026:

| Severità | Numero |
|---|---:|
| Critical | 0 |
| High | 0 |
| Moderate | 4 |
| Low | 0 |
| Totale | 4 |

`npm audit --omit=dev` restituisce **0 vulnerabilità di produzione**.

Aggiornamenti P0 applicati:

- `hono@4.12.26`;
- `vite@7.3.5`;
- `postcss@8.5.15`;
- SheetJS CE `xlsx@0.20.3` dalla distribuzione ufficiale `cdn.sheetjs.com`.

Finding residuo:

- `drizzle-kit@0.31.10`: 4 moderate nella catena di sviluppo `@esbuild-kit`/`esbuild`; npm propone un downgrade breaking e non è stato applicato.

### Ulteriori finding

- nessun CSP/HSTS/X-Frame-Options/secure headers esplicito;
- nessun rate limiting;
- upload di qualsiasi file;
- nessun malware scanning;
- base64 nel database;
- log console con PII e dati sanitari durante import;
- script `run_import_tests.js` con credenziali MySQL hardcoded `root/secret`;
- script distruttivo `clear-and-seed.ts` senza blocco produzione;
- assenza di secret scanning, SAST, dependency scanning e CI.

# 7. Import / Export

| Entità | Import | Export | Valutazione |
|---|---|---|---|
| Aziende | Presente | Presente | Utilizzabile con limiti duplicati/validazione |
| Sedi | Presente | Presente | Import/export presenti; CRUD UI incompleto |
| Dipendenti | Presente | Presente | Export incompleto per campi annidati |
| Attestati | Presente | Presente | Export incompleto; stato import forzato a valido |
| Visite | Presente | Presente | Permessi errati ed export nome lavoratore incompleto |
| Mansioni | Solo template | Assente | Incompleto |
| Corsi | Solo template | Assente come corsi | Incompleto |
| Commesse | Solo template | Assente | Incompleto |
| Rischi | Assente | Assente | Non iniziato |
| Tipologie formazione | Assente | Assente | Non iniziato |
| Documenti | Upload file | Download file | Non è un import/export strutturato; storage non production |
| Scadenziario | N/A | Presente | Mapping parzialmente errato |
| Audit Log | N/A | Assente | Incompleto |
| Microclima | Assente | Pulsante mock | Non iniziato |
| Notifiche | Assente | Assente | Non iniziato |
| OT23 | Assente | Pulsante mock | Non iniziato |

Problemi trasversali:

- nessuna atomicità batch;
- nessun registro import persistente;
- conversione date non affidabile;
- matching entità basato su nomi;
- nessuna gestione grandi volumi;
- nessuna protezione formula injection negli export Excel;
- nessun controllo server-side dedicato agli export sanitari.

# 8. Debito Tecnico

## TODO/FIXME espliciti

- sostituzione upload base64 con storage S3;
- UI create/edit Sedi non implementata;
- import Mansioni/Corsi/Commesse non implementato;
- conteggio dipendenti per mansione assente.

## Codice mock e placeholder

- intero modulo Microclima con dati mock;
- notifiche Microclima simulate;
- OT23 simulato;
- riepilogo formazione lavoratore hardcoded;
- numerosi pulsanti senza handler:
  - Dashboard Export;
  - Aggiungi/Modifica lavoratore;
  - Richiedi visita;
  - Nuovo corso;
  - Nuova mansione/rischio/tipologia;
  - Segna risolta Microclima;
  - Documenta/Esporta OT23.

## Workaround temporanei

- documenti e branding in base64;
- fallback secret JWT di sviluppo;
- login dev tramite query string;
- controlli export sanitario solo frontend;
- status conformità persistiti invece di calcolati/aggiornati da job;
- import con cast `any`;
- matching per nome anziché identificatori stabili.

## Qualità del codice

- type-check: superato;
- lint: **66 errori**;
- test automatici: assenti;
- script test import: manuale, modifica DB e usa credenziali hardcoded;
- nessuna coverage;
- nessuna pipeline CI;
- nessuna E2E;
- nessun test migrazioni o restore.

## Debito architetturale

- nessuna transazione;
- nessuna paginazione;
- nessun service layer;
- logica compliance duplicata tra router;
- RBAC accoppiato a una gerarchia numerica;
- assenza di scope dati;
- schema ampio con moduli non implementati;
- migration discipline fragile;
- documentazione non sempre aggiornata rispetto al codice.

# 9. Stato Produzione

| Area | Readiness |
|---|---:|
| Frontend | **54%** |
| Backend | **46%** |
| Database | **55%** |
| Sicurezza | **18%** |
| Prodotto complessivo | **39%** |

## Motivazione

### Frontend — 54%

UI ampia e coerente, ma molte azioni sono simulate, non collegate o producono export incompleti. Mancano route guard, gestione errori robusta, paginazione e workflow CRUD completi.

### Backend — 46%

Buona base tRPC/Drizzle e 48 procedure, ma mancano interi domini, CRUD fondamentali, transazioni, scheduler, scope dati e autorizzazioni corrette.

### Database — 55%

Schema esteso e migration presente, ma database non verificabile, FK core assenti, tabelle inutilizzate e processo migration/seed non sufficientemente sicuro.

### Sicurezza — 18%

Credential/session leakage, accessi sanitari errati, dipendenze vulnerabili, assenza di hardening, audit incompleto e documentale non sicuro sono blocchi di rilascio.

### Prodotto — 39%

Il prodotto è dimostrabile con dati sintetici, ma non è affidabile né sufficientemente protetto per un utilizzo commerciale reale.

# 10. Product Backlog

## P0 — Blocco rilascio

| Attività | Impatto | Dipendenze | Complessità | Priorità |
|---|---|---|---|---|
| Revocare il `kimi_sid`, rimuovere `cookiejar.txt` e ripulire la history Git | Elimina sessione compromessa | Accesso provider auth/Git | Media | P0 |
| Attivare secret scanning e policy sui file sensibili | Previene nuove fughe | CI/repository hosting | Bassa | P0 |
| Ridisegnare RBAC come matrice permessi read/write/export per modulo | Protegge dati e rende usabili i ruoli | Requisiti organizzativi | Alta | P0 |
| Implementare scope utente per azienda/sede/commessa | Isolamento dati | RBAC, schema scope | Alta | P0 |
| Correggere accessi sanitari alle visite e completare scope organizzativi dei documenti | GDPR e riservatezza | RBAC/scope | Alta | P0 |
| Gestire utenti, ruoli, attivazione e revoca accesso | Governance account | RBAC | Media | P0 |
| Correggere OAuth state, issuer/audience/client, durata e revoca sessioni | Sicurezza login | Provider Kimi | Alta | P0 |
| Risolvere la catena vulnerabile dev `drizzle-kit`/`@esbuild-kit` senza downgrade breaking | Porta anche l'audit completo a zero | Release compatibile di Drizzle o sostituzione toolchain | Media | P0 |
| Portare documenti su storage privato con URL firmate | Sicurezza, performance, backup | S3/storage, RBAC | Alta | P0 |
| Aggiungere MIME allowlist, antivirus, hash e limiti server reali | Sicurezza upload | Storage | Media | P0 |
| Rendere disponibile il DB e validare migration su ambiente pulito | Avviabilità prodotto | Infrastruttura MySQL | Media | P0 |
| Aggiungere FK core, vincoli univoci e strategia delete | Integrità dati | Data cleanup/migration | Alta | P0 |
| Correggere `.gitignore` e definire processo migration versionato | Deploy ripetibile | Governance DB | Bassa | P0 |
| Creare test unitari, integrazione DB, auth/RBAC ed E2E core | Riduce regressioni | Ambiente test | Alta | P0 |
| Creare CI con type-check, lint, test, audit e build | Gate di qualità | Test suite | Media | P0 |
| Portare lint a zero errori | Baseline qualità | Nessuna | Media | P0 |
| Rimuovere/disabilitare tutte le funzionalità mock e CTA non operative dal prodotto vendibile | Evita dichiarazioni funzionali false | Decisione scope release | Media | P0 |

## P1 — Core prodotto

| Attività | Impatto | Dipendenze | Complessità | Priorità |
|---|---|---|---|---|
| Completare UI CRUD Lavoratori | Core operativo | RBAC, FK | Media | P1 |
| Completare UI/API CRUD Sedi | Anagrafiche | Aziende, FK | Media | P1 |
| Completare CRUD Mansioni/Rischi/associazioni | Compliance corretta | Schema/versioning requisiti | Alta | P1 |
| Completare CRUD Corsi/Attestati | Formazione operativa | RBAC | Alta | P1 |
| Completare workflow visite e giudizi | Sorveglianza operativa | Privacy/RBAC | Alta | P1 |
| Correggere tutti gli export con DTO server-side espliciti | Affidabilità dati | API export | Media | P1 |
| Normalizzare date import ed eliminare match per nome | Integrità import | Identificatori stabili | Media | P1 |
| Rendere import atomici e registrare batch/righe/errori | Auditabilità | Tabelle import, transazioni | Alta | P1 |
| Implementare ricalcolo scadenze e generazione alert schedulata | Compliance reale | Scheduler | Alta | P1 |
| Unificare logica compliance sui requisiti della mansione | Accuratezza dashboard | CRUD mansioni | Media | P1 |
| Completare risoluzione/assegnazione/escalation alert | Operatività | Notification engine futuro | Media | P1 |
| Rendere Audit Log atomico e completo | Tracciabilità | Transazioni, auth | Alta | P1 |
| Aggiungere paginazione, filtri server e limiti massimi | Scalabilità | API | Media | P1 |
| Aggiungere error handling, empty/error state e route guard frontend | UX e sicurezza | RBAC | Media | P1 |
| Proteggere seed/clear-and-seed dagli ambienti non locali | Sicurezza operativa | Config ambienti | Bassa | P1 |

## P2 — Moduli avanzati

| Attività | Impatto | Dipendenze | Complessità | Priorità |
|---|---|---|---|---|
| Implementare API e persistenza Microclima | Abilita modulo | Ingestion meteo/sensori | Alta | P2 |
| Definire calcolo WBGT, soglie e qualità dato | Correttezza tecnica | Esperto dominio/normativa | Alta | P2 |
| Implementare Notification Engine con outbox/retry | Alert proattivi | Provider email/SMS/push | Alta | P2 |
| Implementare configurazione notifiche e destinatari | Usabilità | Notification engine | Media | P2 |
| Implementare workflow OT23, evidenze e approvazioni | Valore commerciale | Documentale, audit, Microclima | Alta | P2 |
| Generare dossier/export OT23 | Deliverable cliente | Workflow OT23 | Alta | P2 |
| Implementare Commesse/Reparti e scope referente | Modello organizzativo | RBAC/scope | Alta | P2 |
| Implementare Non Conformità e azioni correttive | Gestione HSE completa | Alert/audit | Alta | P2 |
| Implementare versioning documenti e requisiti | Storico normativo | Storage/schema | Media-Alta | P2 |
| Completare import/export Mansioni, Corsi, Commesse e cataloghi | Migrazione dati | CRUD relativi | Media | P2 |

## P3 — Industrializzazione e go-live

| Attività | Impatto | Dipendenze | Complessità | Priorità |
|---|---|---|---|---|
| Definire infrastruttura, ambienti e deployment ripetibile | Operatività | CI/CD | Alta | P3 |
| Backup, restore testato, retention e disaster recovery | Continuità | DB/storage | Alta | P3 |
| Logging strutturato, metriche, tracing e alerting | Supporto produzione | Infrastruttura | Media | P3 |
| Test performance e dimensionamento | Scalabilità | Dataset realistico | Media | P3 |
| Security review/pentest indipendente | Riduzione rischio | P0 completati | Media | P3 |
| DPIA, registro trattamenti, retention sanitaria e accordi privacy | Conformità GDPR | Processi legali | Alta | P3 |
| Runbook supporto, incident response e SLA | Esercizio commerciale | Monitoring | Media | P3 |
| Manuale utente/admin e documentazione API/deploy | Adozione e supporto | Funzioni stabilizzate | Media | P3 |
| UAT con clienti pilota e criteri formali di accettazione | Validazione prodotto | Release candidate | Alta | P3 |

# 11. Conclusione

## Posso vendere oggi LogosSafety?

**No, non come prodotto SaaS/gestionale pronto per produzione e non con dati reali di lavoratori o dati sanitari.**

Motivazione tecnica:

- esiste una sessione autenticata versionata nel repository;
- autorizzazioni e ruoli non rispettano il principio del minimo privilegio;
- i dati clinici sono segregati per ruolo, ma mancano scope organizzativi, retention e ulteriori controlli privacy;
- l'audit delle dipendenze di produzione è a zero; restano 4 moderate nella sola toolchain di sviluppo Drizzle;
- il database operativo non è raggiungibile né verificato;
- la maggior parte delle relazioni core non ha FK;
- non esistono test automatizzati o CI;
- documenti e asset sono salvati in base64 nel DB;
- Microclima, Notifiche e OT23 non sono funzionalità reali;
- diversi workflow e pulsanti dichiarati non funzionano;
- import/export e audit non garantiscono atomicità e completezza.

LogosSafety può essere presentato oggi solo come **demo/prototipo con dati sintetici**, oppure usato in un pilot tecnico non produttivo con perimetro e limitazioni formalmente dichiarati. Prima della vendita è necessario chiudere almeno tutto il backlog P0 e validare i workflow P1 indispensabili al perimetro commerciale scelto.
