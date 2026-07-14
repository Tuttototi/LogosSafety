# RBAC module access

## Scopo

Questo documento descrive la matrice di accesso modulo per il portale LogosSafety dopo la chiusura Milestone 2.

La sorgente tecnica per menu e route React e' `app/src/lib/module-access.ts`.
La sorgente backend per ruolo, scope e permessi e' `CoreIdentityService`, tramite `auth.me`.

Il client non sceglie il ruolo: usa esclusivamente il ruolo e le permission restituite dal backend.

## Regole globali

- `segnalatore` accede solo a `/segnalazioni/app`.
- `/segnalazioni/app` non monta `AppLayout` e non mostra sidebar.
- Tutti gli altri ruoli entrano in `/`.
- Le route gestionali sono protette anche da accesso diretto URL.
- La sidebar mostra solo moduli accessibili dalla stessa policy usata dalla route guard.
- Le API sensibili devono continuare a validare autorizzazione e scope lato backend.

## Matrice moduli

| Ruolo | Home | Moduli principali |
|---|---|---|
| admin | `/` | Tutti i moduli gestionali, Anagrafiche e Utenti completa, Audit, Impostazioni |
| rspp | `/` | Dashboard, Segnalazioni, Microclima, Sorveglianza operativa, HSE, Anagrafiche limitate, Import/Export |
| aspp | `/` | Dashboard, Segnalazioni, Microclima, Sorveglianza operativa, HSE, Anagrafiche limitate, Import/Export |
| responsabile_sicurezza | `/` | Dashboard, Segnalazioni, Microclima, Sorveglianza operativa/clinica autorizzata, HSE, Anagrafiche limitate, Audit |
| operatore_sicurezza | `/` | Dashboard, Segnalazioni, Microclima, Sorveglianza operativa, HSE, Anagrafiche limitate, Import/Export |
| capo_area | `/` | Dashboard, Segnalazioni, Microclima e moduli operativi pertinenti |
| capo_impianto | `/` | Dashboard, Segnalazioni, Microclima e moduli operativi pertinenti |
| referente_commessa | `/` | Dashboard, Segnalazioni e moduli operativi pertinenti |
| operatore | `/` | Dashboard e Segnalazioni personali |
| dipendente | `/` | Dashboard e Segnalazioni personali |
| segnalatore | `/segnalazioni/app` | Solo Safety App segnalatore |

## Anagrafiche e Utenti

Admin puo' assegnare tutti gli 11 ruoli operativi:

- admin
- rspp
- aspp
- responsabile_sicurezza
- operatore_sicurezza
- capo_area
- capo_impianto
- referente_commessa
- operatore
- dipendente
- segnalatore

RSPP, ASPP, Responsabile Sicurezza e Operatore Sicurezza possono usare Anagrafiche e Utenti solo per ruoli operativi non privilegiati:

- operatore
- dipendente

Il backend rifiuta stringhe arbitrarie con schema Zod chiuso e blocca l'assegnazione di ruoli non consentiti al profilo corrente.

## Scope

Gli accessi sono sempre tenant/company-bound tramite Core Identity.

I profili non Admin non possono assegnare scope fuori dal proprio perimetro organizzativo. Admin resta limitato al tenant/company corrente e non riceve privilegi cross-tenant.

## Limiti residui

- Alcuni router legacy usano ancora middleware gerarchici per ruolo e non permission granulari per singola azione.
- Lo scope per impianti e aree e' parziale perche' il modello fisico legacy non persiste ancora tutto il Core Domain dedicato.
- L'audit centralizzato delle decisioni RBAC resta un'evoluzione successiva.
