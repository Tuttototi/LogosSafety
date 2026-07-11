# Product Backlog LogosSafety

**Ultimo aggiornamento:** 12 luglio 2026

## Completato

| Area | Task | Stato |
|---|---|---|
| Architettura | Definire Application Context, ownership dati, eventi e confini moduli | Completato |
| Core Identity | Implementare Core Identity Context backend con adapter legacy e integrazione Segnalazioni | Completato |
| Core / Segnalazioni | Implementare Organizational Scope Resolver e query appalti/commesse visibili | Completato |
| Core Domain | Definire modello condiviso per tenant, organizzazioni, persone, account, ruoli, permessi e scope | Completato |
| Segnalazioni | Collegare SegnalatoreApp alle API reali per lista, creazione e dettaglio | Completato |
| Segnalazioni | Esporre API backend tRPC per creazione, lista e dettaglio con repository persistente | Completato |
| Segnalazioni | Validare migrazione e repository persistente su database MySQL locale isolato | Completato |
| Segnalazioni | Implementare schema Drizzle e repository persistente non collegato alla UI | Completato |
| Segnalazioni | Definire application layer con use case e ports astratti | Completato |
| Segnalazioni | Consolidare domain model con autore autenticato e perimetro organizzativo | Completato |
| Segnalazioni | Definire workflow ufficiale dominio Segnalazioni | Completato |
| Segnalazioni | Definire domain model TypeScript per API, database e frontend futuri | Completato |
| Segnalazioni | Stabilizzare mount App Segnalatore dopo modularizzazione | Completato |
| Segnalazioni | Modularizzare architettura interna di SegnalatoreApp | Completato |
| Segnalazioni | Aggiungere tab Comunicazioni Sicurezza mock in App Segnalatore | Completato |
| Segnalazioni | Creare App Segnalatore React riusabile per pagina e smartphone floating | Completato |
| Layout | Configurare favicon reale LogosSafety nel browser | Completato |
| Layout | Sostituire logo provvisorio sidebar con logo reale Logos | Completato |
| Segnalazioni | Usare asset logo Logos nella UI mobile segnalatore React | Completato |
| Segnalazioni | Migliorare smartphone floating con schermo bianco uniforme e drag & drop | Completato |
| Segnalazioni | Assorbire la UI segnalatore mobile statica in React dentro lo smartphone floating | Completato |
| Aziende | Preparare Import Excel con template coerente, validazione frontend/backend, gestione duplicati e test automatici | Completato |

## P0 — Blocco rilascio

| Area | Task | Motivazione | Stato |
|---|---|---|---|
| Sicurezza | Completare matrice permessi per modulo e azione | Necessario per least privilege commerciale | Aperto |
| Sicurezza | Applicare scope azienda/sede/commessa agli endpoint core | Necessario per isolamento dati SaaS | Aperto |
| Database | Aggiungere vincoli univoci e FK core, inclusi identificativi Aziende | Riduce duplicati e record orfani | Aperto |
| Import/Export | Rendere gli import atomici con transazioni e rollback batch | Evita import parziali incoerenti | Aperto |
| Import/Export | Persistire import batch, righe, errori ed esiti | Necessario per auditabilità operativa | Aperto |

## P1 — Core Prodotto

| Area | Task | Motivazione | Stato |
|---|---|---|---|
| Aziende | Aggiungere controlli DB su duplicati Partita IVA/Codice Fiscale/nome | Completa la protezione oltre la validazione applicativa | Aperto |
| Aziende | Registrare audit diff campo per campo su update/import | Migliora tracciabilità cliente | Aperto |
| Sedi | Completare UI create/edit | Completa CRUD Sedi | Aperto |
| Lavoratori | Completare UI CRUD e import/export coerenti | Priorità prodotto successiva | Aperto |
| Segnalazioni | Normalizzare modello Core per impianti e aree operative | Completa il resolver oltre `microclimate_sites` e abilita aree reali | Aperto |
| Segnalazioni | Completare endpoint backend Segnalazioni per audit atomico, allegati reali, commenti e workflow operativo | Completa il flusso operativo senza legacy PHP | Aperto |
| Core Domain | Migrare gli adapter legacy identity verso tabelle Core dedicate persons/memberships/role_assignments/tenants | Necessario per superare il boundary temporaneo basato su schema legacy | Aperto |
| Sicurezza | Definire matrice RBAC ruolo-permesso basata su Core Domain | Necessario per sostituire gerarchie ruolo hardcoded | Aperto |
| Architettura | Introdurre outbox/event bus interno per eventi cross-module | Necessario per Audit Log, Notifiche, Scadenze e read model | Aperto |
| Architettura | Migrare router legacy verso application layer e port per modulo | Riduce accesso diretto alle tabelle e dipendenze implicite | Aperto |
| Import/Export | Implementare import/export Mansioni, Corsi, Commesse e cataloghi | Chiude gap wizard attuale | Aperto |

## P2 — Evoluzione

| Area | Task | Motivazione | Stato |
|---|---|---|---|
| Dashboard | Collegare KPI e drill-down a filtri azienda/sede | Usabilità direzionale | Aperto |
| Documentale | Spostare file su storage privato con URL firmate | Sicurezza e scalabilità | Aperto |
| Microclima | Implementare API e persistenza reale | Modulo prioritario avanzato | Aperto |
| OT23 | Implementare workflow evidenze e dossier | Valore commerciale | Aperto |
| Notifiche | Implementare engine con outbox/retry | Alert proattivi | Aperto |
