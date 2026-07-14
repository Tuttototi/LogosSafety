# Anagrafiche e Utenti

## Scopo

La pagina **Anagrafiche e Utenti** introduce il primo flusso amministrativo reale di LogosSafety:

1. login unico;
2. account risolto dal backend;
3. persona collegata tramite Core Identity;
4. ruolo e scope letti dal database;
5. gestione amministrativa di persone, account, ruoli e perimetri.

Redirect post-login:

- `segnalatore` entra nella Safety App mobile su `/#/segnalazioni/app`;
- tutti gli altri ruoli entrano nel portale LogosSafety completo su `/#/`.

La pagina e' visibile inizialmente solo al ruolo `admin`.

## Persona e Account

Persona e account sono concetti distinti.

- **Persona**: record anagrafico operativo, oggi persistito nella tabella legacy `workers`.
- **Account**: accesso applicativo, oggi persistito nella tabella `users`.
- **Scope**: perimetro organizzativo, oggi persistito in `user_organization_scopes`.

Una persona puo' esistere senza account. In quel caso e' censita in LogosSafety ma non puo' autenticarsi.

## Creazione Persona

Il form richiede:

- nome;
- cognome;
- codice fiscale;
- data di nascita;
- luogo di nascita;
- azienda;
- stato attivo.

Email e telefono sono normalizzati lato backend. Il codice fiscale viene normalizzato uppercase/trim e non viene restituito completo nelle liste UI.

Il backend blocca duplicati evidenti di codice fiscale nel perimetro company dell'admin.

## Abilitazione Account

L'opzione **Abilita accesso a LogosSafety** e' separata dalla creazione persona.

Se disattiva:

- viene creata solo la persona;
- non viene creato alcun account in `users`;
- la persona non puo' autenticarsi.

Se attiva:

- l'email diventa obbligatoria;
- viene creato o collegato l'account `users`;
- il ruolo viene validato lato backend;
- lo scope viene validato lato backend;
- il backend non accetta tenant, ruoli o permessi arbitrari dal client.

## Ruoli

I ruoli assegnabili da **Anagrafiche e Utenti** sono un set chiuso:

- `admin`
- `rspp`
- `aspp`
- `responsabile_sicurezza`
- `operatore_sicurezza`
- `capo_area`
- `capo_impianto`
- `referente_commessa`
- `operatore`
- `dipendente`
- `segnalatore`

Le stringhe ruolo arbitrarie vengono respinte lato API.

## Scope

Lo scope viene validato contro record reali:

- azienda;
- sede;
- appalto/commessa;
- impianto, quando presente nel catalogo `microclimate_sites`.

Mapping persistente attuale:

- `companyId` -> `user_organization_scopes.company_id`
- `siteId` -> `user_organization_scopes.site_id`
- `contractId` -> `user_organization_scopes.contract_id`

Il modello legacy non ha ancora colonne dedicate a impianto e area in `user_organization_scopes`. L'impianto viene validato quando fornito, ma il perimetro persistente resta company/sede/appalto finche' non sara' introdotto il modello Core dedicato.

Per `admin` lo scope resta company/tenant locale, senza `canAccessAllTenants`.

## Blocco Account

Il blocco account aggiorna `users.active = false`.

Il record persona resta invariato. Un account bloccato non puo' essere risolto da Core Identity come attore attivo.

## RBAC

Tutte le procedure tRPC del modulo:

- richiedono sessione autenticata;
- risolvono l'attore con `CoreIdentityService`;
- richiedono ruolo `admin`;
- limitano le operazioni alla company dell'admin;
- non accettano tenant o permessi dal client.

## Audit

Sono auditati:

- persona creata;
- persona modificata;
- account abilitato;
- account bloccato o riattivato;
- ruolo modificato;
- scope modificato.

L'audit usa metadata sanitizzati e non inserisce il codice fiscale completo in `reason`, `oldValue` o `newValue`.

## Bootstrap Admin Locale

Lo script:

```bash
npm run admin:bootstrap
```

crea o aggiorna in modo idempotente l'admin locale reale configurato per lo sviluppo. Il bootstrap:

- rifiuta `NODE_ENV=production`;
- accetta solo database locali `localhost:3306/logos_safety`;
- non cancella dati esistenti;
- non stampa password o connection string complete;
- collega persona e account secondo il mapping `workers` + `users` + `user_organization_scopes`.

## Limiti Residui

- Il modello Core dedicato `persons/memberships/role_assignments` non e' ancora migrato fisicamente.
- Lo scope persistente non include ancora colonne impianto/area.
- Import Excel e gestione massiva lavoratori/appalti sono fuori da questa slice.
- La matrice permessi commerciale resta da consolidare per tutti i moduli.
