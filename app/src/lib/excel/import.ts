import * as XLSX from "xlsx";

export function normalizeHeader(header: string): string {
  if (!header && header !== "") return "";
  // remove surrounding whitespace and asterisks, underscores, slashes, hyphens
  let h = String(header).trim();
  // remove asterisks and trailing/leading non alphanumeric chars
  h = h.replace(/\*/g, "");
  // normalize accents
  h = h.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  // lowercase
  h = h.toLowerCase();
  // remove spaces, underscores, slashes, hyphens and any non alnum
  h = h.replace(/[^a-z0-9]+/g, "");
  return h;
}

export type ImportType =
  | "dipendenti"
  | "attestati"
  | "visite"
  | "mansioni"
  | "corsi"
  | "aziende"
  | "sedi"
  | "commesse";

export type ColumnMapping = {
  excelCol: string;
  dbField: string;
  required: boolean;
  validator?: (val: string) => string | null; // null = valid, string = error
};

export type ValidationError = {
  row: number;
  column: string;
  value: string;
  message: string;
  severity: "error" | "warning";
};

export type ParsedRow = {
  rowNum: number;
  data: Record<string, string>;
  errors: ValidationError[];
};

export type RowValidator = (
  data: Record<string, string>,
  rowNum: number
) => ValidationError[];

// ─── Field definitions per import type ──────────────────────────
export const FIELD_DEFS: Record<ImportType, ColumnMapping[]> = {
  dipendenti: [
    { excelCol: "Cognome", dbField: "lastName", required: true },
    { excelCol: "Nome", dbField: "firstName", required: true },
    {
      excelCol: "Codice Fiscale",
      dbField: "fiscalCode",
      required: false,
      validator: validateFiscalCode,
    },
    {
      excelCol: "Data Nascita",
      dbField: "birthDate",
      required: false,
      validator: validateDate,
    },
    { excelCol: "Luogo Nascita", dbField: "birthPlace", required: false },
    { excelCol: "Sesso", dbField: "gender", required: false },
    {
      excelCol: "Email",
      dbField: "email",
      required: false,
      validator: validateEmail,
    },
    { excelCol: "Telefono", dbField: "phone", required: false },
    { excelCol: "Mansione", dbField: "jobRoleName", required: true },
    { excelCol: "Azienda", dbField: "companyName", required: true },
    { excelCol: "Sede", dbField: "siteName", required: false },
    {
      excelCol: "Data Assunzione",
      dbField: "hireDate",
      required: false,
      validator: validateDate,
    },
    { excelCol: "Note", dbField: "notes", required: false },
  ],
  attestati: [
    { excelCol: "Cognome", dbField: "lastName", required: true },
    { excelCol: "Nome", dbField: "firstName", required: true },
    { excelCol: "Tipo Corso", dbField: "trainingTypeName", required: true },
    { excelCol: "Titolo Corso", dbField: "courseTitle", required: true },
    { excelCol: "Ente Formatore", dbField: "provider", required: false },
    {
      excelCol: "Data Corso",
      dbField: "courseDate",
      required: true,
      validator: validateDate,
    },
    {
      excelCol: "Data Scadenza",
      dbField: "expiryDate",
      required: true,
      validator: validateDate,
    },
    {
      excelCol: "Numero Attestato",
      dbField: "certificateNumber",
      required: false,
    },
    { excelCol: "Durata Ore", dbField: "durationHours", required: false },
    { excelCol: "Modalita", dbField: "modality", required: false },
    { excelCol: "Esito", dbField: "validityStatus", required: false },
    { excelCol: "Note", dbField: "notes", required: false },
  ],
  visite: [
    { excelCol: "Cognome", dbField: "lastName", required: true },
    { excelCol: "Nome", dbField: "firstName", required: true },
    { excelCol: "Tipo Visita", dbField: "visitType", required: true },
    { excelCol: "Medico Competente", dbField: "doctorName", required: false },
    {
      excelCol: "Data Visita",
      dbField: "visitDate",
      required: true,
      validator: validateDate,
    },
    {
      excelCol: "Prossima Visita",
      dbField: "nextVisitDue",
      required: false,
      validator: validateDate,
    },
    { excelCol: "Giudizio", dbField: "judgment", required: true },
    {
      excelCol: "Limitazioni",
      dbField: "limitationDescription",
      required: false,
    },
    {
      excelCol: "Prescrizioni",
      dbField: "prescriptionDescription",
      required: false,
    },
    { excelCol: "Protocollo", dbField: "healthProtocol", required: false },
    { excelCol: "Note", dbField: "notes", required: false },
  ],
  mansioni: [
    { excelCol: "Nome Mansione", dbField: "name", required: true },
    { excelCol: "Descrizione", dbField: "description", required: false },
    { excelCol: "Livello Rischio", dbField: "riskLevel", required: true },
    {
      excelCol: "Visita Medica Obbligatoria",
      dbField: "requiresMedicalVisit",
      required: true,
    },
    { excelCol: "Rischi Associati", dbField: "riskNames", required: false },
    {
      excelCol: "Formazione Richiesta",
      dbField: "trainingTypeNames",
      required: false,
    },
  ],
  corsi: [
    { excelCol: "Titolo", dbField: "title", required: true },
    {
      excelCol: "Tipo Formazione",
      dbField: "trainingTypeName",
      required: true,
    },
    { excelCol: "Ente Formatore", dbField: "provider", required: false },
    {
      excelCol: "Riferimento Normativo",
      dbField: "normativeReference",
      required: false,
    },
    { excelCol: "Durata Ore", dbField: "durationHours", required: false },
    { excelCol: "Modalita", dbField: "modality", required: false },
    {
      excelCol: "Data Corso",
      dbField: "courseDate",
      required: false,
      validator: validateDate,
    },
    { excelCol: "Stato", dbField: "status", required: false },
    { excelCol: "Note", dbField: "notes", required: false },
  ],
  aziende: [
    { excelCol: "Nome", dbField: "name", required: true },
    { excelCol: "Partita IVA", dbField: "vatNumber", required: false },
    {
      excelCol: "Codice Fiscale",
      dbField: "fiscalCode",
      required: false,
      validator: validateFiscalCode,
    },
    { excelCol: "Indirizzo", dbField: "address", required: true },
    { excelCol: "Citta", dbField: "city", required: true },
    { excelCol: "Provincia", dbField: "province", required: true },
    { excelCol: "CAP", dbField: "zipCode", required: true },
    { excelCol: "Telefono", dbField: "phone", required: false },
    {
      excelCol: "Email",
      dbField: "email",
      required: true,
      validator: validateEmail,
    },
    {
      excelCol: "PEC",
      dbField: "pec",
      required: false,
      validator: validateEmail,
    },
    {
      excelCol: "Cooperativa",
      dbField: "isCooperative",
      required: false,
      validator: validateBooleanText,
    },
  ],
  sedi: [
    { excelCol: "Nome", dbField: "name", required: true },
    { excelCol: "Azienda", dbField: "companyName", required: true },
    { excelCol: "Codice", dbField: "code", required: false },
    { excelCol: "Indirizzo", dbField: "address", required: false },
    { excelCol: "Citta", dbField: "city", required: false },
    { excelCol: "Provincia", dbField: "province", required: false },
  ],
  commesse: [
    { excelCol: "Codice", dbField: "code", required: true },
    { excelCol: "Nome", dbField: "name", required: true },
    { excelCol: "Descrizione", dbField: "description", required: false },
    {
      excelCol: "Data Inizio",
      dbField: "startDate",
      required: false,
      validator: validateDate,
    },
    {
      excelCol: "Data Fine",
      dbField: "endDate",
      required: false,
      validator: validateDate,
    },
    { excelCol: "Stato", dbField: "status", required: false },
  ],
};

// ─── Validators ─────────────────────────────────────────────────
export function validateFiscalCode(cf: string): string | null {
  if (!cf || cf.length === 0) return null; // optional
  cf = cf.trim().toUpperCase();
  if (cf.length !== 16 && cf.length !== 11)
    return "Codice fiscale deve essere 11 o 16 caratteri";
  const re = /^[A-Z0-9]+$/;
  if (!re.test(cf)) return "Codice fiscale contiene caratteri non validi";
  return null;
}

export function validateDate(val: string): string | null {
  if (!val || val.length === 0) return null;
  // Try multiple formats
  const patterns = [
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
  ];
  if (!patterns.some(p => p.test(val.trim()))) {
    return "Formato data non valido. Usa DD/MM/YYYY o YYYY-MM-DD";
  }
  const d = parseDate(val);
  if (!d || isNaN(d.getTime())) return "Data non valida";
  if (d.getFullYear() < 1900 || d.getFullYear() > 2100)
    return "Anno fuori range (1900-2100)";
  return null;
}

export function validateEmail(val: string): string | null {
  if (!val || val.length === 0) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(val.trim())) return "Email non valida";
  return null;
}

export function validateBooleanText(val: string): string | null {
  if (!val || val.length === 0) return null;
  const normalized = val.trim().toLowerCase();
  if (["si", "sì", "true", "1", "yes", "y", "no", "false", "0", "n"].includes(normalized)) {
    return null;
  }
  return "Valore booleano non valido. Usa SI/NO";
}

function parseDate(val: string): Date | null {
  const v = val.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split("/");
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [d, m, y] = v.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

// ─── Parse Excel file ───────────────────────────────────────────
export function parseExcelFile(file: ArrayBuffer): string[] {
  const workbook = XLSX.read(file, { type: "array" });
  return workbook.SheetNames;
}

export function readSheet(
  file: ArrayBuffer,
  sheetName: string | number
): Record<string, string>[] {
  const workbook = XLSX.read(file, { type: "array" });
  const sheet =
    workbook.Sheets[
      typeof sheetName === "number" ? workbook.SheetNames[sheetName] : sheetName
    ];
  if (!sheet) return [];
  // Read as array-of-arrays to capture raw header row
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  const rawHeaders =
    aoa && aoa[0]
      ? aoa[0].map((h: unknown) => (h === null || h === undefined ? "" : String(h)))
      : [];
  const normalizedHeaders = rawHeaders.map((h: string) => normalizeHeader(h));

  // Read rows as objects using original headers
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // Convert each row into an object keyed by normalized header
  const out: Record<string, string>[] = json.map((row) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < rawHeaders.length; i++) {
      const orig = rawHeaders[i];
      const key = normalizedHeaders[i] ?? normalizeHeader(orig ?? "");
      let val = row[orig] ?? row[key] ?? "";
      if (val instanceof Date) {
        const d = val as Date;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        val = `${dd}/${mm}/${yyyy}`;
      }
      obj[key] = val === null || val === undefined ? "" : String(val).trim();
    }
    if (rawHeaders.length === 0) {
      // Fallback: use keys from sheet_to_json
      for (const k of Object.keys(row)) {
        const nk = normalizeHeader(k);
        let v = row[k];
        if (v instanceof Date) {
          const d = v as Date;
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          v = `${dd}/${mm}/${yyyy}`;
        }
        obj[nk] = v === null || v === undefined ? "" : String(v).trim();
      }
    }
    return obj;
  });

  return out;
}

// ─── Validate rows ──────────────────────────────────────────────
export function validateRows(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  duplicateCheck?: (row: Record<string, string>) => boolean,
  rowValidator?: RowValidator
): ParsedRow[] {
  return rows.map((row, idx) => {
    const rowNum = idx + 2; // +2 because row 1 is header
    const errors: ValidationError[] = [];
    const data: Record<string, string> = {};

    for (const mapping of mappings) {
      const normalizedKey = normalizeHeader(mapping.excelCol);
      const val = row[normalizedKey] ?? "";
      data[mapping.dbField] = (val as string).trim();

      // Check required
      if (mapping.required && !(val as string).trim()) {
        errors.push({
          row: rowNum,
          column: mapping.excelCol,
          value: val,
          message: `Campo obbligatorio mancante: ${mapping.excelCol}`,
          severity: "error",
        });
        continue;
      }

      // Run validator
      if (mapping.validator && val.trim()) {
        const err = mapping.validator(val.trim());
        if (err) {
          errors.push({
            row: rowNum,
            column: mapping.excelCol,
            value: val,
            message: err,
            severity: "error",
          });
        }
      }
    }

    if (rowValidator) {
      errors.push(...rowValidator(data, rowNum));
    }

    // Duplicate check
    if (duplicateCheck && duplicateCheck(row)) {
      errors.push({
        row: rowNum,
        column: "—",
        value: "—",
        message: "Record duplicato rilevato",
        severity: "warning",
      });
    }

    return { rowNum, data, errors };
  });
}

export function validateCompanyImportData(
  data: Record<string, string>,
  rowNum: number
): ValidationError[] {
  if (data.vatNumber || data.fiscalCode) {
    return [];
  }

  return [
    {
      row: rowNum,
      column: "Partita IVA / Codice Fiscale",
      value: "",
      message: "Inserire almeno uno tra Partita IVA e Codice Fiscale",
      severity: "error",
    },
  ];
}

export function getImportRowValidator(
  importType: ImportType
): RowValidator | undefined {
  if (importType === "aziende") return validateCompanyImportData;
  return undefined;
}

// ─── Generate error Excel ───────────────────────────────────────
export function generateErrorExcel(rows: ParsedRow[]): ArrayBuffer {
  const errorRows = rows
    .filter(r => r.errors.length > 0)
    .map(r => ({
      Riga: r.rowNum,
      ...r.data,
      Errori: r.errors.map(e => `${e.column}: ${e.message}`).join("; "),
      Severita: r.errors.some(e => e.severity === "error")
        ? "ERRORE"
        : "AVVISO",
    }));

  const ws = XLSX.utils.json_to_sheet(errorRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errori");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

// ─── Generate template Excel ────────────────────────────────────
export function generateTemplateExcel(importType: ImportType): ArrayBuffer {
  const fields = FIELD_DEFS[importType];
  const headers = fields.map(f => f.excelCol + (f.required ? " *" : ""));
  const example = fields.map(f => getExampleValue(importType, f.dbField));

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

function getExampleValue(type: ImportType, field: string): string {
  const examples: Record<string, Record<string, string>> = {
    dipendenti: {
      lastName: "Rossi",
      firstName: "Mario",
      fiscalCode: "RSSMRA85A01H501Z",
      birthDate: "15/03/1985",
      birthPlace: "Milano",
      gender: "M",
      email: "mario.rossi@email.it",
      phone: "3331234567",
      jobRoleName: "Operaio Edile",
      companyName: "Edilizia Nord Srl",
      siteName: "Cantiere Centro Commerciale",
      hireDate: "01/01/2023",
      notes: "",
    },
    attestati: {
      lastName: "Rossi",
      firstName: "Mario",
      trainingTypeName: "Formazione Generale",
      courseTitle: "Corso Formazione Generale 2024",
      provider: "ProSafety Srl",
      courseDate: "15/03/2024",
      expiryDate: "15/03/2029",
      certificateNumber: "FG-2024-001",
      durationHours: "4",
      modality: "presenza",
      validityStatus: "valido",
      notes: "",
    },
    visite: {
      lastName: "Rossi",
      firstName: "Mario",
      visitType: "periodica",
      doctorName: "Dr. Mario Rossetti",
      visitDate: "20/01/2025",
      nextVisitDue: "20/01/2026",
      judgment: "idoneo",
      limitationDescription: "",
      prescriptionDescription: "",
      healthProtocol: "Protocollo edilizia",
      notes: "",
    },
    mansioni: {
      name: "Operaio Edile",
      description: "Operaio generico edilizia",
      riskLevel: "medio",
      requiresMedicalVisit: "SI",
      riskNames: "Cadute, MMC, Rumore",
      trainingTypeNames: "Formazione Generale, Formazione Specifica",
    },
    corsi: {
      title: "Corso Formazione Generale",
      trainingTypeName: "Formazione Generale",
      provider: "ProSafety Srl",
      normativeReference: "Accordo Stato-Regioni 21/12/2011",
      durationHours: "4",
      modality: "presenza",
      courseDate: "15/03/2024",
      status: "completato",
      notes: "",
    },
    aziende: {
      name: "Edilizia Nord Srl",
      vatNumber: "12345678901",
      fiscalCode: "",
      address: "Via Roma 123",
      city: "Milano",
      province: "MI",
      zipCode: "20121",
      phone: "021234567",
      email: "info@edilizianord.it",
      pec: "edilizianord@pec.it",
      isCooperative: "NO",
    },
    sedi: {
      name: "Cantiere Centro Commerciale",
      companyName: "Edilizia Nord Srl",
      code: "CC-001",
      address: "Via Milano 45",
      city: "Milano",
      province: "MI",
    },
    commesse: {
      code: "COMM-2024-001",
      name: "Centro Commerciale Est",
      description: "Costruzione centro commerciale",
      startDate: "01/01/2024",
      endDate: "31/12/2024",
      status: "attivo",
    },
  };
  return examples[type]?.[field] ?? "";
}

// ─── Export table data ──────────────────────────────────────────
export function exportTableToExcel<T extends Record<string, unknown>>(
  data: T[],
  sheetName: string,
  columnMap?: Record<string, string> // dbField -> displayName
): ArrayBuffer {
  const mapped = columnMap
    ? data.map(row => {
        const out: Record<string, unknown> = {};
        for (const [dbField, displayName] of Object.entries(columnMap)) {
          out[displayName] = row[dbField] ?? "";
        }
        return out;
      })
    : data;

  const ws = XLSX.utils.json_to_sheet(mapped);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export function downloadExcel(buffer: ArrayBuffer, filename: string) {
  type BrowserDownloadDocument = {
    createElement: (tagName: "a") => {
      href: string;
      download: string;
      click: () => void;
    };
    body: {
      appendChild: (element: unknown) => void;
      removeChild: (element: unknown) => void;
    };
  };

  const browserDocument = (
    globalThis as typeof globalThis & { document?: BrowserDownloadDocument }
  ).document;
  if (!browserDocument) {
    throw new Error("Download Excel disponibile solo nel browser");
  }

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = browserDocument.createElement("a");
  a.href = url;
  a.download = filename;
  browserDocument.body.appendChild(a);
  a.click();
  browserDocument.body.removeChild(a);
  URL.revokeObjectURL(url);
}
