# Segnalazioni - Utenti UAT Locali

## Obiettivo

Questo documento descrive le identita' locali per il collaudo manuale end-to-end del modulo Segnalazioni.

Gli utenti sono disponibili solo su database locale e DEV auth. Non sono un secondo sistema di autenticazione: il login DEV crea una sessione, poi Core Identity risolve user, worker/person, company, ruolo, scope e permessi dal database.

## Prerequisiti

- `DEV_AUTH_ENABLED=true`.
- Frontend in modalita' dev con `VITE_DEV_AUTH_ENABLED=true`.
- Database MySQL locale su `localhost:3306`.
- Database `logos_safety`.
- Variabile `DEV_DATABASE_URL` o `DATABASE_URL` puntata al database locale.
- Non usare database remoti o produzione.

## Seed

Eseguire dalla cartella `app`:

```bash
npm run uat:seed:segnalazioni
```

Lo script:

- rifiuta `NODE_ENV=production`;
- rifiuta database non locali;
- usa o crea solo fixture UAT/locali;
- e' idempotente;
- non fa truncate;
- non resetta il database;
- non stampa password o secret.

## Utenti

| Identita' | Nome | Ruolo | Email locale |
|---|---|---|---|
| Admin UAT | Salvatore Candura | `admin` | `uat.admin.segnalazioni@logosafety.local` |
| Segnalatore UAT | Mario Rossi | `segnalatore` | `uat.segnalatore.segnalazioni@logosafety.local` |

## Scope

Lo script usa prima i record locali esistenti:

- `Codex Runtime Company`;
- `Codex Runtime Site`;
- `CODEX-RUNTIME-CONTRACT`;
- `Codex Runtime Job`.

Se non sono presenti, crea fixture minime con prefisso `UAT`.

Per gli impianti usa `microclimate_sites` solo come sorgente dello scope operativo Segnalazioni. Se non esiste un impianto locale attivo, crea:

- `UAT - Impianto Segnalazioni`;
- codice `UAT-SEGN-PLANT`.

## Login DEV

Aprire `/login` in ambiente dev.

Sono disponibili due pulsanti:

- `Accesso locale Admin UAT`;
- `Accesso locale Segnalatore UAT`.

Endpoint diretti:

- `/api/dev/login?identity=admin`;
- `/api/dev/login?identity=segnalatore`.

La selezione identita' DEV e' disponibile solo se `DEV_AUTH_ENABLED=true` e non in produzione.

## Cambio Utente

1. Eseguire logout dall'app.
2. Tornare a `/login`.
3. Selezionare l'altra identita' UAT.

In alternativa, in ambiente locale, aprire direttamente uno degli endpoint DEV sopra.

## Ciclo UAT Minimo

1. Login come Mario Rossi / Segnalatore.
2. Aprire `/segnalazioni/app`.
3. Creare una nuova segnalazione UAT nello scope disponibile.
4. Verificare che Mario la veda nella propria lista.
5. Cambiare identita' DEV.
6. Login come Salvatore Candura / Admin.
7. Aprire `/segnalazioni`.
8. Verificare che Admin veda la segnalazione.
9. Prendere in carico.
10. Aggiungere commento.
11. Richiedere integrazione.
12. Tornare come Mario Rossi.
13. Verificare la richiesta di integrazione.
14. Inviare integrazione.
15. Tornare come Admin.
16. Risolvere.
17. Chiudere.
18. Tornare come Mario Rossi.
19. Verificare stato finale e timeline.
20. Registrare presa visione.

Non cancellare automaticamente la segnalazione UAT finale: deve restare disponibile per il collaudo manuale.

## Limiti

- Gli allegati reali restano disabilitati fino allo storage sicuro.
- Il seed aggiorna localmente l'enum `users.role` solo se il database locale non accetta ancora i ruoli Core necessari.
- Nessuna identita' UAT imposta `canAccessAllTenants=true`.

