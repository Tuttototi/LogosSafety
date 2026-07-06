# Sprint 1 — Chiusura: Entità Aziende (companies)

**Stato:** ✅ COMPLETE  
**Data chiusura:** 2026-06-18  
**Commit:** `0655008`  
**Scope:** CRUD + Import/Export Excel + Audit Log per l'entità `companies`  

---

## 1. Funzionalità implementate

### CRUD

| Operazione | Backend | Frontend | Audit |
|---|---|---|---|
| **C**rea | `settings.createCompany` | Modale form — pulsante "Nuova" | ✅ `create` |
| **R**ead (lista) | `settings.companies` | Tabella con sedi collegate | — |
| **U**pdate | `settings.updateCompany` | Modale form pre-popolato — icona ✏️ | ✅ `update` |
| **D**elete (soft) | `settings.deleteCompany` | Dialog conferma — icona 🗑️ | ✅ `delete` |

### Import/Export Excel

| Funzionalità | Backend | Frontend | Audit |
|---|---|---|---|
| **Import** | `import.importCompanies` | `ImportExport.tsx` — tipo "Aziende" | ✅ `import` |
| **Export** | `settings.exportCompanies` | `Impostazioni.tsx` — pulsante "Esporta" | ✅ `export` |

### Template Excel

Disponibile in `ImportExport.tsx` → scaricabile per tipo `aziende`.  
Campi: `Nome *`, `Partita IVA`, `Codice Fiscale`, `Indirizzo`, `Città`, `Provincia`, `CAP`, `Telefono`, `Email`, `PEC`, `Cooperativa`.

---

## 2. API Endpoints

### `settings-router.ts`

```
settings.companies          → Query    → Lista aziende attive (con sedi)
settings.createCompany      → Mutation → Crea nuova azienda
settings.updateCompany      → Mutation → Modifica azienda esistente (id richiesto)
settings.deleteCompany      → Mutation → Soft delete (active = false)
settings.exportCompanies    → Query    → Array flat per export Excel
```

### `import-router.ts`

```
import.importCompanies      → Mutation → Import batch da Excel
```

**Input `importCompanies`:**
- `rows`: array di `{ name, vatNumber, fiscalCode, address, city, province, zipCode, phone, email, pec, isCooperative }`
- `duplicateAction`: `"ignora"` | `"aggiorna"` | `"blocca"` (default: `"ignora"`)

**Output:** `{ imported, updated, skipped, errors[], blocked? }`

---

## 3. Audit Log — Azioni tracciate

| Azione | Entity Type | Dettaglio |
|---|---|---|
| `create` | `companies` | Nome azienda creata |
| `update` | `companies` | Nome azienda + motivazione "Modifica azienda: {oldName}" |
| `delete` | `companies` | Nome azienda + motivazione "Eliminazione azienda: {name}" |
| `import` | `companies` | Riepilogo: importate/aggiornate/saltate/errori |
| `export` | `companies` | Numero aziende esportate |

---

## 4. File modificati

| File | Righe | Note |
|---|---|---|
| `api/settings-router.ts` | +42 | `updateCompany`, `deleteCompany`, `exportCompanies` |
| `api/import-router.ts` | +93 | `importCompanies` (prima di `importWorkers`) |
| `src/pages/Impostazioni.tsx` | +346 | Modale CRUD, export, azioni edit/delete |
| `src/pages/ImportExport.tsx` | +16 | `importCompanies` mutation + collegamento `handleImport` |

---

## 5. Note tecniche e limitazioni

### Soft delete
- `deleteCompany` imposta `active = false`, non elimina fisicamente.
- **Attenzione:** sedi e dipendenti collegati rimangono attivi (FK non enforced a DB level).

### Duplicati
- Criterio: nome azienda esatto (case sensitive) + `active = true`.
- Non c'è `uniqueIndex` su `companies.name` — possibili duplicati silenziosi a DB.

### Campo `isCooperative`
- In import: parsing da stringa — accetta `"SI"`, `"true"`, `"1"` (case insensitive).
- In form: checkbox booleano standard.

### Ruoli
- Tutte le operazioni richiedono `operatore_sicurezza` o superiore (middleware `operatoreQuery`).

---

## 6. Verifica build

```bash
npm run build
# ✓ vite build — 1954 modules transformed
# ✓ esbuild boot.js — 2.4mb
# Nessun errore TypeScript
```

---

## 7. Checklist chiusura

- [x] CRUD completo (Crea, Leggi, Modifica, Elimina soft)
- [x] Import Excel con validazione e gestione duplicati
- [x] Export Excel diretto dalla tabella
- [x] Audit Log su tutte le operazioni
- [x] Build senza errori
- [x] Test funzionale manuale (verifica codice)
- [x] Documentazione sprint

---

## 8. Prossimi sprint

| Sprint | Entità | Stima |
|---|---|---|
| Sprint 1.5 | **Sedi** (`sites`) — CRUD + Import/Export + Audit | Medio |
| Sprint 2 | **Mansioni** (`jobRoles`) — CRUD + Import/Export + Audit | Medio |
| Sprint 3 | **Corsi** (`trainingCourses`) — completare update/delete/import | Medio |

---

*Documento prodotto da PMO Agent — LogosSafety Sprint 1*
