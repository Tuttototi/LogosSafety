import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const outDir = path.join(process.cwd(), "tmp");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function writeFile(name, headers, rows) {
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  fs.writeFileSync(path.join(outDir, name), buf);
  console.log("Wrote", name);
}

// Dipendenti template
const dipHeaders = [
  "Cognome *",
  "Nome *",
  "Codice Fiscale",
  "Data Nascita",
  "Luogo Nascita",
  "Sesso",
  "Email",
  "Telefono",
  "Mansione *",
  "Azienda *",
  "Sede",
  "Data Assunzione",
  "Note",
];
const dipRows = [
  [
    "Rossi",
    "Mario",
    "RSSMRA85A01H501Z",
    "15/03/1985",
    "Milano",
    "M",
    "mario.rossi@email.it",
    "3331234567",
    "Operaio Edile",
    "Edilizia Nord Srl",
    "Cantiere Centro",
    "01/01/2023",
    "",
  ],
  [
    "Bianchi",
    "Luca",
    "BNCLCU90B02F205X",
    "20/06/1990",
    "Torino",
    "M",
    "luca.bianchi@email.it",
    "3332345678",
    "Operaio Edile",
    "Edilizia Nord Srl",
    "",
    "15/02/2022",
    "",
  ],
  [
    "Verdi",
    "Anna",
    "VRDANN80C03D207Y",
    "05/11/1980",
    "Milano",
    "F",
    "anna.verdi@email.it",
    "3333456789",
    "Ufficio",
    "Edilizia Nord Srl",
    "",
    "01/07/2020",
    "",
  ],
  // missing fiscal code
  [
    "Neri",
    "Paolo",
    "",
    "12/12/1982",
    "Genova",
    "M",
    "",
    "",
    "Operaio Edile",
    "Edilizia Nord Srl",
    "",
    "",
    "",
  ],
  // invalid birth date
  [
    "Gialli",
    "Laura",
    "GLLLRA70A01H501Z",
    "31/02/1985",
    "Milano",
    "F",
    "",
    "",
    "Ufficio",
    "Edilizia Nord Srl",
    "",
    "",
    "",
  ],
  // duplicate (same as Rossi)
  [
    "Rossi",
    "Mario",
    "RSSMRA85A01H501Z",
    "15/03/1985",
    "Milano",
    "M",
    "",
    "",
    "Operaio Edile",
    "Edilizia Nord Srl",
    "",
    "",
    "",
  ],
];
writeFile("dipendenti_test.xlsx", dipHeaders, dipRows);

// Attestati template
const attHeaders = [
  "Cognome *",
  "Nome *",
  "Tipo Corso *",
  "Titolo Corso *",
  "Ente Formatore",
  "Data Corso *",
  "Data Scadenza *",
  "Numero Attestato",
  "Durata Ore",
  "Modalita",
  "Esito",
  "Note",
];
const attRows = [
  [
    "Rossi",
    "Mario",
    "Formazione Generale",
    "Corso Formazione 2024",
    "ProSafety Srl",
    "15/03/2024",
    "15/03/2029",
    "FG-2024-001",
    "4",
    "presenza",
    "valido",
    "",
  ],
  [
    "Bianchi",
    "Luca",
    "Formazione Specifica",
    "Corso Specifico",
    "ProSafety Srl",
    "10/05/2023",
    "10/05/2028",
    "FS-2023-001",
    "8",
    "presenza",
    "valido",
    "",
  ],
  [
    "Verdi",
    "Anna",
    "Formazione Generale",
    "Corso Base",
    "ProSafety Srl",
    "20/02/2022",
    "20/02/2027",
    "FB-2022-001",
    "6",
    "e-learning",
    "valido",
    "",
  ],
  // missing course
  ["Neri", "Paolo", "", "", "ProSafety Srl", "", "", "", "", "", "", ""],
  // Excel date objects for course and expiry
  [
    "Gialli",
    "Laura",
    "Formazione Generale",
    "Corso DateExcel",
    "ProSafety Srl",
    new Date(2024, 2, 15),
    new Date(2029, 2, 15),
    "DX-2024-001",
    "4",
    "presenza",
    "valido",
    "",
  ],
  // duplicate
  [
    "Rossi",
    "Mario",
    "Formazione Generale",
    "Corso Formazione 2024",
    "ProSafety Srl",
    "15/03/2024",
    "15/03/2029",
    "FG-2024-001",
    "4",
    "presenza",
    "valido",
    "",
  ],
];
writeFile("attestati_test.xlsx", attHeaders, attRows);

// Visite template
const visHeaders = [
  "Cognome *",
  "Nome *",
  "Tipo Visita *",
  "Medico Competente",
  "Data Visita *",
  "Prossima Visita",
  "Giudizio *",
  "Limitazioni",
  "Prescrizioni",
  "Protocollo",
  "Note",
];
const visRows = [
  [
    "Rossi",
    "Mario",
    "periodica",
    "Dr. Mario Rossetti",
    "20/01/2025",
    "20/01/2026",
    "idoneo",
    "",
    "",
    "Protocollo edilizia",
    "",
  ],
  [
    "Bianchi",
    "Luca",
    "periodica",
    "Dr. Mario Rossetti",
    "15/02/2024",
    "15/02/2025",
    "idoneo",
    "",
    "",
    "",
    "",
  ],
  [
    "Verdi",
    "Anna",
    "visita_iniziale",
    "Dr. Mario Rossetti",
    "10/03/2023",
    "",
    "idoneo",
    "",
    "",
    "",
    "",
  ],
  // rientro malattia
  [
    "Neri",
    "Paolo",
    "rientro_malattia",
    "Dr. Mario Rossetti",
    "05/05/2024",
    "",
    "idoneo",
    "",
    "",
    "",
    "",
  ],
  // idoneo con limitazioni
  [
    "Gialli",
    "Laura",
    "periodica",
    "Dr. Mario Rossetti",
    "12/06/2024",
    "12/06/2025",
    "idoneo_con_limitazioni",
    "Limitazione: sollevamento pesi",
    "",
    "",
    "",
  ],
];
writeFile("visite_test.xlsx", visHeaders, visRows);

console.log("All test files generated in", outDir);
