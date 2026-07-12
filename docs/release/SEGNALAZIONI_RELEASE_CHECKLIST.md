# Segnalazioni - Release Checklist MVP

## Stato

Classificazione proposta: READY FOR USER ACCEPTANCE se i gate automatici e il collaudo manuale locale restano verdi.

## Prerequisiti ambiente

- Branch `main` aggiornato.
- Database MySQL locale dedicato a LogosSafety, non remoto e non produzione.
- Migrazioni Segnalazioni applicate fino ad audit log e notification outbox.
- Utenti di test con ruoli e scope organizzativi coerenti.
- Utenti UAT locali creati con `npm run uat:seed:segnalazioni`.
- Nessuna credenziale reale o dato sensibile nei record di prova.

## Comandi test

```bash
npm run lint
npm run check
npm test -- core
npm test -- segnalazioni
npm test -- segnalatore-app-ui
npm test -- audit-notification-outbox
npm run build
```

## Flussi verificati

- Segnalatore: accesso, apertura App Segnalatore, selezione scope operativo, creazione, lista, dettaglio, commento, integrazione, presa visione, timeline.
- Gestore: lista per scope autorizzato, filtri dashboard, dettaglio, presa in carico, commento, richiesta integrazione, risoluzione, chiusura, timeline.
- Smartphone floating: apertura, scroll interno, form, lista, dettaglio e workflow con gli stessi hook dell'app full page.
- Desktop `/segnalazioni`: metriche per stato, priorita' alta/critica, filtri server-side, detail link, notifiche in-app e azioni capability-based.

## Ruoli da collaudare

- Admin UAT: Salvatore Candura, login DEV `identity=admin`.
- Segnalatore UAT: Mario Rossi, login DEV `identity=segnalatore`.
- Segnalatore / dipendente / operatore: creazione, lista personale, dettaglio, integrazione richiesta, presa visione.
- Capo impianto: visibilita' limitata al proprio impianto e workflow gestore.
- Capo area: visibilita' limitata alla propria area e workflow gestore.
- Referente commessa: visibilita' limitata alle commesse assegnate e workflow gestore.
- RSPP / ASPP / sicurezza / responsabile sicurezza: visibilita' nel perimetro autorizzato e workflow gestore.
- Admin: visibilita' nel tenant autorizzato, senza superare tenant/company.

## Funzionalita' complete per MVP

- Create/list/detail reali via API LogosSafety.
- Scope organizzativo risolto server-side.
- Filtri dashboard per stato, priorita', appalto/commessa, sede/impianto, autore e periodo.
- Workflow operativo: presa in carico, commento, richiesta integrazione, integrazione, cambio stato, risoluzione, chiusura, presa visione.
- Capability calcolate server-side e usate dalla UI.
- Timeline e commenti nel dettaglio desktop e app segnalatore.
- Audit persistente e notification outbox transazionale per le azioni applicative.
- Notifiche in-app minime derivate da timeline/commenti visibili.
- Cache invalidata dopo create e mutazioni workflow.

## Funzionalita' rinviate

- Upload/download allegati reali.
- Stato letta/non letta persistente delle notifiche in-app.
- Motore generico notifiche multi-canale.
- Email, SMS, push, WhatsApp.
- Dashboard KPI avanzate e SLA.

## Utenti UAT locali

Procedura dettagliata: `docs/testing/SEGNALAZIONI_UAT_USERS.md`.

## Bug noti e limiti residui

- Gli allegati sono disabilitati: esistono metadati DB, ma manca uno storage sicuro riusabile con download protetto e policy RBAC.
- Le notifiche in-app sono derivate dalle segnalazioni visibili e non leggono destinatari risolti dalla outbox.
- Il badge notifiche conta eventi derivati non persistiti come letti/non letti.
- La ricerca testuale resta client-side sui risultati gia' filtrati dall'API.

## Criterio GO / NO-GO

GO:

- Tutti i comandi test sono verdi.
- Creazione, lista, dettaglio e workflow funzionano per almeno un ruolo segnalatore e un ruolo gestore.
- Nessun record cross-tenant o cross-scope e' visibile.
- Errori mostrati in UI sono sanitizzati.
- Smartphone e pagina desktop restano utilizzabili.

NO-GO:

- Creazione segnalazione impossibile.
- Scope organizzativo o tenant isolation errati.
- Workflow rotto o capability UI diverse dal backend.
- Errori SQL/stack trace esposti all'utente.
- Smartphone o dashboard desktop inutilizzabili.
- Allegati richiesti come obbligatori senza storage reale disponibile.
