# Logos Safety

Gestionale sicurezza sul lavoro per Logos/CFL. Gestisce dipendenti, formazione, sorveglianza sanitaria, mansioni, scadenziario, documenti e audit log.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Hono + tRPC 11 + Drizzle ORM + MySQL
- **Auth**: OAuth 2.0 (Kimi)
- **Excel**: SheetJS/xlsx (import/export)

## Requisiti

- Node.js 20+
- MySQL (connessione via `DATABASE_URL` nel file `.env`)

## Avvio in VS Code

### 1. Apri il progetto

```bash
cd /mnt/agents/output/app
# oppure apri la cartella in VS Code: File > Apri cartella
```

### 2. Installa dipendenze (se necessario)

```bash
npm install
```

### 3. Configura il database

Il file `.env` e' gia' configurato. Sincronizza lo schema:

```bash
npm run db:push
```

### 4. Avvia il server di sviluppo

```bash
npm run dev
```

L'app sara' disponibile su **http://localhost:3000**

## Comandi utili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia server sviluppo (HMR) |
| `npm run build` | Build produzione |
| `npm run check` | Type-check TypeScript |
| `npm run db:push` | Sincronizza schema DB |
| `npm start` | Avvia server produzione |

## Struttura

```
app/
  src/           # Frontend (React)
    pages/       # Pagine (Dashboard, Dipendenti, Formazione, ...)
    components/  # Componenti UI
    hooks/       # Custom hooks (useAuth, useBranding)
    lib/         # Utils (excel/import.ts, status-utils.ts)
  api/           # Backend (tRPC routers)
    import-router.ts
    middleware.ts
    document-router.ts
    audit-router.ts
  db/            # Schema database (Drizzle)
    schema.ts
    create-branding.ts
  contracts/     # Tipi condivisi frontend/backend
  .env           # Configurazione (gia' impostata)
```

## Moduli principali

- **Dashboard** — Panoramica conformita' con matrice semaforica
- **Dipendenti** — Anagrafica lavoratori con export Excel
- **Formazione** — Corsi, attestati con scadenze
- **Sorveglianza Sanitaria** — Visite mediche, giudizi, limitazioni
- **Scadenziario** — Alert scadenze formazione e visite
- **Documenti** — Gestione allegati
- **Import/Export** — Wizard Excel con validazione e azione duplicati
- **Audit Log** — Tracciamento operazioni (admin/auditor)
- **Impostazioni** — Branding (logo, colori, favicon)

## Ruoli utente

| Ruolo | Livello | Permessi |
|-------|---------|----------|
| admin | 7 | Tutto |
| responsabile_sicurezza | 6 | Tutto tranne gestione utenti |
| operatore_sicurezza | 5 | CRUD dati, no audit |
| medico_competente | 4 | Visite mediche, export sanitari |
| referente_commessa | 3 | Solo lettura commessa |
| auditor | 2 | Solo audit log |
| sola_lettura | 1 | Solo lettura |

## Import/Export Excel

### Wizard import (7 tipi supportati)
1. Seleziona tipo (Dipendenti, Attestati, Visite, Mansioni, Corsi, Aziende, Commesse)
2. Carica file .xlsx/.xls (max 10MB)
3. Anteprima con validazione e azione sui duplicati
4. Riepilogo risultato

### Azioni sui duplicati
- **Ignora** — Salta i duplicati, importa solo i nuovi
- **Aggiorna** — Sovrascrive i dati esistenti
- **Blocca** — Annulla l'importazione se trova un duplicato

### Export
- Dipendenti, Formazione, Sorveglianza, Scadenziario
- Export sanitari vincolato a admin/resp.sicurezza/medico

## Problemi noti

- **Upload file** — Attualmente base64 (produzione: servizio storage esterno)
- **Validazione upload** — Check dimensione lato server su base64 length
