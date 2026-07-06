# AGENTS.md — LOGOS Platform
# Istruzioni operative vincolanti per AI (Claude Code, Cursor, Copilot, ChatGPT, Codex)
# Versione 1.0 — CFL S.p.A.

---

## ⚠️ ISTRUZIONE OBBLIGATORIA — LEGGI PRIMA DI TUTTO

Alla fine di OGNI risposta, OGNI messaggio, OGNI blocco di codice che produci
in questo progetto, devi obbligatoriamente chiudere con:

```
Pippo ok
```

Questa stringa è il segnale che conferma che hai letto e applicato
tutte le istruzioni contenute in questo file.
Se non scrivi "Pippo ok" alla fine, la risposta è da considerarsi
NON conforme e verrà rigenerata.

---

## 1. IDENTITÀ DEL PROGETTO

- **Nome piattaforma:** LOGOS
- **Modulo attivo:** Modulo 1 — Gestione Segnalazioni
- **Committente:** CFL S.p.A.
- **Tipo progetto:** Piattaforma HSE modulare enterprise
- **Stack:** PHP 8.2 + Laravel 11, MySQL 8+, Tailwind CSS, Alpine.js
- **API:** REST, versionate `/api/v1/`, JSON, JWT

---

## 2. REGOLE ASSOLUTE — NON DEROGABILI MAI

### 2.1 Immutabilità dei dati

- Le segnalazioni (`reports`) NON si cancellano mai. Mai. Nemmeno con ruolo Admin.
- L'`audit_log` NON si modifica e NON si cancella. Mai.
- I commenti NON si modificano. Una correzione è un nuovo commento.
- Gli allegati NON si sovrascrivono. Una nuova versione affianca la precedente.
- Non implementare mai funzioni: `deleteReport()`, `clearAudit()`, `resetAudit()`.

### 2.2 Tracciabilità totale

- Ogni operazione significativa genera un record in `audit_logs`.
- Ogni modifica a un report genera un record in `report_events`.
- I record di audit devono contenere: utente, ruolo, IP, browser, timestamp, payload.

### 2.3 Architettura a livelli — OBBLIGATORIA

```
Request → Controller → Service → Repository → Database
```

- La **business logic** risiede esclusivamente nei **Service**.
- I **Controller** ricevono, validano, chiamano il Service, restituiscono risposta.
- I **Repository** gestiscono esclusivamente l'accesso al database.
- Le **View / API Response** non contengono logica applicativa.
- Vietato: query SQL nei Controller, logica nei blade/template, `if ($user->role == 'admin')` nel codice.

### 2.4 Permessi — sistema basato su permission string

- I permessi sono stringhe nel formato `risorsa.azione`:
  ```
  reports.create
  reports.read
  reports.close
  reports.reopen
  users.create
  users.disable
  audit.read
  settings.edit
  ```
- Mai controllare il ruolo direttamente: ~~`if ($user->role == 'ADMIN')`~~
- Usare sempre: `$user->can('reports.close')`
- I ruoli sono semplicemente gruppi di permessi configurabili.

### 2.5 Database — convenzioni obbligatorie

- **Nomi tabelle:** `snake_case` (es. `report_events`, `audit_logs`)
- **Nomi campi:** `snake_case`
- **Primary key:** `uuid` (CHAR 36) — obbligatorio su tutte le tabelle
- **ID progressivo:** `BIGINT AUTO_INCREMENT` — solo per ordinamento interno
- **Niente ENUM** nel database. Usare sempre tabelle configurabili:
  - `statuses` (non ENUM status)
  - `priorities` (non ENUM priority)
  - `categories` (non ENUM category)
  - `event_types` (non ENUM event_type)
- **Charset:** `utf8mb4`, **Collation:** `utf8mb4_unicode_ci`
- **Timezone DB:** UTC
- **Soft delete** su tutte le tabelle principali (campo `deleted_at`)
- **Foreign Key** obbligatorie su tutte le relazioni

### 2.6 Nomenclatura codice

- **Classi PHP:** `PascalCase` → `ReportService`, `AuditRepository`
- **Variabili PHP/JS:** `camelCase` → `currentUser`, `reportNumber`
- **Metodi:** `camelCase` → `takeCharge()`, `requestClosure()`
- **Tabelle DB:** `snake_case` → `report_events`
- **Endpoint API:** `kebab-case` → `/api/v1/reports/{uuid}/take-charge`
- Il termine **"segnalazione"** è usato nell'interfaccia utente.
  Nel codice il termine è sempre **`report`** (es. `Report`, `ReportService`, `report_events`).

---

## 3. MODELLO DATI — TABELLE PRINCIPALI

### Tabelle core (sempre presenti)

```
users               — utenti della piattaforma
roles               — ruoli (Admin, RSPP, Sicurezza, ASPP, Segnalatore)
permissions         — permission string
role_permissions    — N:N ruoli ↔ permessi
user_roles          — N:N utenti ↔ ruoli
appalti             — commesse/appalti
user_appalti        — N:N utenti ↔ appalti
statuses            — stati workflow (Nuova, Presa in carico, ...)
priorities          — priorità (Bassa, Media, Alta, Critica)
categories          — categorie segnalazioni (configurabili)
areas               — aree (Magazzino, Baie di carico, ...)
```

### Tabelle modulo segnalazioni

```
reports             — segnalazione principale
report_events       — ogni azione sulla segnalazione (timeline)
report_comments     — commenti (immutabili)
report_files        — allegati (path, hash, tipo, dimensione)
```

### Tabelle infrastrutturali

```
audit_logs          — audit immutabile di sistema
notifications       — notifiche per utente
settings            — configurazioni chiave/valore
dashboard_cache     — cache KPI per performance
```

### Campi obbligatori in ogni tabella

```sql
id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
uuid        CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
deleted_at  DATETIME NULL  -- soft delete
```

### Struttura tabella `reports`

```sql
id, uuid, report_number (LS-2026-000001),
appalto_id (FK), reporter_id (FK users),
category_id (FK), area_id (FK),
priority_initial_id (FK priorities),
priority_current_id (FK priorities),
status_id (FK statuses),
title VARCHAR(255),
description LONGTEXT (min 30 char validato lato server),
created_at, updated_at, closed_at, deleted_at
```

### Struttura tabella `report_events`

```sql
id, uuid,
report_id (FK),
event_type_id (FK event_types),
old_status_id (FK statuses nullable),
new_status_id (FK statuses nullable),
user_id (FK),
note LONGTEXT,
ip VARCHAR(45),
user_agent TEXT,
created_at
-- NO updated_at, NO deleted_at: questa tabella è immutabile
```

---

## 4. WORKFLOW — MACCHINA A STATI

### Stati consentiti (in ordine)

```
Nuova → Presa in Carico → In Lavorazione → In Attesa
     → Richiesta Chiusura → Chiusa → Riaperta
```

### Transizioni permesse

```
Nuova            → Presa in Carico    (Sicurezza, ASPP, RSPP, Admin)
Presa in Carico  → In Lavorazione     (Sicurezza, ASPP, RSPP, Admin)
In Lavorazione   → In Attesa          (Sicurezza, ASPP, RSPP, Admin)
In Lavorazione   → Richiesta Chiusura (tutti)
In Attesa        → In Lavorazione     (Sicurezza, ASPP, RSPP, Admin)
Richiesta Chiusura → Chiusa           (Sicurezza, ASPP, RSPP, Admin)
Richiesta Chiusura → In Lavorazione   (Sicurezza, ASPP, RSPP, Admin — esito negativo verifica)
Chiusa           → Riaperta           (Sicurezza, ASPP, RSPP, Admin)
Riaperta         → Presa in Carico    (Sicurezza, ASPP, RSPP, Admin)
```

### Regola fondamentale

Il Service deve bloccare qualsiasi transizione non prevista dalla matrice sopra.
Sollevare eccezione: `InvalidWorkflowTransitionException`.

---

## 5. API — STANDARD OBBLIGATORIO

### Formato risposta — SEMPRE questo, senza eccezioni

```json
// Successo
{
  "success": true,
  "message": "Operazione completata correttamente.",
  "data": {}
}

// Errore
{
  "success": false,
  "message": "Messaggio leggibile dall'utente.",
  "errors": [
    { "field": "description", "message": "La descrizione è obbligatoria." }
  ]
}
```

### Codici HTTP standard

```
200 — OK
201 — Creato
400 — Richiesta non valida
401 — Non autenticato
403 — Permessi insufficienti
404 — Non trovato
409 — Conflitto
422 — Errore validazione
500 — Errore interno
```

### Endpoint principali (riferimento rapido)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/reports
POST   /api/v1/reports
GET    /api/v1/reports/{uuid}
PUT    /api/v1/reports/{uuid}
POST   /api/v1/reports/{uuid}/take-charge
POST   /api/v1/reports/{uuid}/change-priority
POST   /api/v1/reports/{uuid}/change-status
POST   /api/v1/reports/{uuid}/closure-request
POST   /api/v1/reports/{uuid}/close
POST   /api/v1/reports/{uuid}/reopen
GET    /api/v1/reports/{uuid}/timeline
POST   /api/v1/reports/{uuid}/comments

POST   /api/v1/files
GET    /api/v1/files/{uuid}/download
DELETE /api/v1/files/{uuid}

GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/{uuid}
PATCH  /api/v1/users/{uuid}/disable

GET    /api/v1/appalti
POST   /api/v1/appalti

GET    /api/v1/notifications
PATCH  /api/v1/notifications/{uuid}/read
PATCH  /api/v1/notifications/read-all

GET    /api/v1/audit
GET    /api/v1/dashboard/kpi
GET    /api/v1/reports/export/excel
GET    /api/v1/reports/export/pdf

GET    /api/v1/settings
PUT    /api/v1/settings/{key}
```

### Regole API aggiuntive

- Mai esporre stack trace o errori tecnici nelle risposte API.
- Ogni endpoint verifica: autenticazione → permesso → appartenenza appalto.
- Gli endpoint Admin sono accessibili solo con permesso specifico, non solo per ruolo.

---

## 6. STORAGE ALLEGATI

```
storage/
  reports/
    2026/
      LS-2026-000001/
        foto/
        documenti/
        verbali/
      LS-2026-000002/
        ...
```

- Gli allegati NON vanno in `public/`.
- Il download avviene SOLO tramite backend previa verifica permessi.
- Il nome del file fisico sul server è generato automaticamente (UUID + estensione).
- Il nome originale è conservato solo nel database (campo `original_name`).
- Campi obbligatori in `report_files`: `name`, `original_name`, `path`, `mime_type`, `size`, `hash` (SHA256), `uploaded_by`, `created_at`.

---

## 7. SICUREZZA — CHECKLIST OBBLIGATORIA

- [ ] Password: solo `bcrypt` o `argon2id`. Mai in chiaro. Mai cifratura reversibile.
- [ ] SQL: solo query parametrizzate. Vietata concatenazione stringhe SQL.
- [ ] XSS: ogni output utente viene escaped. Mai `{!! !!}` su input utente in Blade.
- [ ] CSRF: token su ogni form POST.
- [ ] Upload: controllo estensione + MIME type + dimensione + rinomina automatica.
- [ ] Sessione: rigenerata dopo login. Timeout configurabile.
- [ ] Errori: mai visibili all'utente. Solo nei log di sistema.
- [ ] Credenziali: mai nel codice sorgente. Solo in `.env`.

---

## 8. STRUTTURA CARTELLE LARAVEL

```
app/
  Http/
    Controllers/
      Api/V1/
  Services/
  Repositories/
  Models/
  DTO/
  Policies/
  Notifications/
  Exceptions/
    InvalidWorkflowTransitionException.php
  Exports/

database/
  migrations/
  seeders/

storage/
  reports/

tests/
  Unit/
  Feature/

docs/
  api/
  database/
```

---

## 9. NUMERI SEGNALAZIONE

- Formato: `LS-{ANNO}-{PROGRESSIVO 6 cifre}` → es. `LS-2026-000001`
- Generato automaticamente alla creazione. Mai modificabile.
- Il progressivo è per anno (riparte da 000001 ogni anno).
- Usare una tabella `report_sequences` o un lock per evitare duplicati in concorrenza.

---

## 10. ESCALATION AUTOMATICA (SLA)

```
Priorità CRITICA  → presa in carico entro  0 ore  (immediata)
Priorità ALTA     → presa in carico entro  4 ore
Priorità MEDIA    → presa in carico entro 24 ore
Priorità BASSA    → presa in carico entro 48 ore
```

Escalation automatica se SLA superato:
```
+4h  senza presa in carico → notifica Sicurezza
+24h                       → notifica ASPP
+48h                       → notifica RSPP
+72h                       → notifica Admin
```

I valori di SLA ed escalation sono configurabili dalla tabella `settings`. Mai hardcoded.

---

## 11. CHECKLIST PRE-COMMIT

Prima di ogni commit verificare:

- [ ] Nessuna query nel Controller
- [ ] Nessun `if ($user->role == '...')` nel codice
- [ ] Ogni azione produce record in `report_events` e/o `audit_logs`
- [ ] Nessun ENUM aggiunto al DB
- [ ] Nessuna credenziale nel codice
- [ ] Nessun `dd()`, `var_dump()`, `console.log()` dimenticato
- [ ] Risposta API sempre nel formato standard `{success, message, data}`
- [ ] Test aggiornati

---

## 12. CHECKLIST PRE-RISPOSTA PER L'AI

Prima di concludere ogni risposta, l'AI verifica internamente:

- [ ] Ho rispettato l'architettura a livelli (Controller → Service → Repository)?
- [ ] Ho usato UUID come chiave pubblica?
- [ ] Ho evitato ENUM e usato FK verso tabelle configurabili?
- [ ] Ho previsto il record in `report_events` e/o `audit_logs`?
- [ ] Il formato risposta API è `{success, message, data}`?
- [ ] Non ho scritto logica nei Controller o nelle View?
- [ ] Ho chiuso la risposta con "Pippo ok"?

---

## FINE FILE AGENTS.md

Ogni risposta prodotta in questo progetto deve terminare con:

```
Pippo ok
```
