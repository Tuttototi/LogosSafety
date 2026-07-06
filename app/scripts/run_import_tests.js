import XLSX from "xlsx";
import mysql from "mysql2/promise";
import path from "path";

const DB = {
  host: "localhost",
  user: "root",
  password: "secret",
  database: "logos_safety",
};

function normalizeHeader(header) {
  if (!header && header !== "") return "";
  let h = String(header).trim();
  h = h.replace(/\*/g, "");
  h = h.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  h = h.toLowerCase();
  h = h.replace(/[^a-z0-9]+/g, "");
  return h;
}

function readFileRows(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const rawHeaders =
    aoa && aoa[0] ? aoa[0].map(h => (h == null ? "" : String(h))) : [];
  const normalized = rawHeaders.map(h => normalizeHeader(h));
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const out = json.map(row => {
    const obj = {};
    for (let i = 0; i < rawHeaders.length; i++) {
      const orig = rawHeaders[i];
      const key = normalized[i] || normalizeHeader(orig || "");
      let val = row[orig] ?? row[key] ?? "";
      if (val instanceof Date) {
        const d = val;
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        val = `${dd}/${mm}/${yyyy}`;
      }
      obj[key] = val == null ? "" : String(val).trim();
    }
    if (rawHeaders.length === 0) {
      for (const k of Object.keys(row)) {
        const nk = normalizeHeader(k);
        obj[nk] = String(row[k] ?? "").trim();
      }
    }
    return obj;
  });
  return { rawHeaders, normalized, out };
}

function toSqlDate(v) {
  if (!v) return null;
  // already YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // try Date parse
  const dt = new Date(v);
  if (!isNaN(dt.getTime())) {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

async function run() {
  const conn = await mysql.createConnection(DB);
  const results = [];

  // DIPENDENTI
  const dipPath = path.join(process.cwd(), "tmp", "dipendenti_test.xlsx");
  const { rawHeaders, normalized, out } = readFileRows(dipPath);
  console.log("Dipendenti headers:", rawHeaders);
  console.log("Normalized headers:", normalized);
  // validate and insert similar to import-router
  let inserted = 0;
  let errors = 0;
  for (let i = 0; i < out.length; i++) {
    const r = out[i];
    const rowNum = i + 2;
    const firstName =
      r["nome"] || r["firstname"] || r["firstName"] || r["firstname"];
    const lastName =
      r["cognome"] || r["lastname"] || r["lastName"] || r["lastname"];
    const fiscalCode = r["codicefiscale"] || r["fiscalcode"] || r["fiscalCode"];
    const hireDate = r["dataassunzione"] || r["hiredate"];
    const jobRoleName =
      r["mansionename"] ||
      r["mansione"] ||
      r["mansion"] ||
      r["mansionename"] ||
      r["mansione"];
    const companyName = r["azienda"] || r["companyname"] || r["azienda"];
    if (!firstName || !lastName || !jobRoleName || !companyName) {
      console.log(`Dipendenti row ${rowNum} missing required`);
      errors++;
      continue;
    }
    // find job role
    const [roles] = await conn.execute(
      "SELECT id, requires_medical_visit FROM job_roles WHERE name = ? LIMIT 1",
      [jobRoleName]
    );
    if ((roles || []).length === 0) {
      console.log(`Row ${rowNum} role not found: ${jobRoleName}`);
      errors++;
      continue;
    }
    const role = roles[0];
    const [comps] = await conn.execute(
      "SELECT id FROM companies WHERE name = ? LIMIT 1",
      [companyName]
    );
    if ((comps || []).length === 0) {
      console.log(`Row ${rowNum} company not found: ${companyName}`);
      errors++;
      continue;
    }
    const comp = comps[0];
    // Insert
    await conn.execute(
      "INSERT INTO workers (first_name,last_name,fiscal_code,company_id,job_role_id,hire_date,status,requires_medical_visit,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
      [
        firstName,
        lastName,
        fiscalCode || null,
        comp.id,
        role.id,
        toSqlDate(hireDate),
        "attivo",
        role.requires_medical_visit ? 1 : 0,
        1,
      ]
    );
    inserted++;
  }
  results.push({ type: "dipendenti", inserted, errors, total: out.length });

  // ATTESTATI
  const attPath = path.join(process.cwd(), "tmp", "attestati_test.xlsx");
  const att = readFileRows(attPath);
  console.log("Attestati headers:", att.rawHeaders);
  let ins_att = 0;
  let err_att = 0;
  for (let i = 0; i < att.out.length; i++) {
    const r = att.out[i];
    const rowNum = i + 2;
    const lastName = r["cognome"];
    const firstName = r["nome"];
    const trainingTypeName = r["tipocorso"] || r["tipocorso"];
    const courseTitle = r["titolocorso"] || r["titolocorso"];
    if (!lastName || !firstName || !trainingTypeName || !courseTitle) {
      console.log(`Att row ${rowNum} missing req`);
      err_att++;
      continue;
    }
    // find worker
    const [ws] = await conn.execute(
      'SELECT id FROM workers WHERE last_name = ? AND first_name = ? AND status = "attivo" LIMIT 1',
      [lastName, firstName]
    );
    if ((ws || []).length === 0) {
      console.log(`Att row ${rowNum} worker not found`);
      err_att++;
      continue;
    }
    const workerId = ws[0].id;
    // find training type
    const [tts] = await conn.execute(
      "SELECT id FROM training_types WHERE name = ? LIMIT 1",
      [trainingTypeName]
    );
    if ((tts || []).length === 0) {
      console.log(`Att row ${rowNum} trainingType not found`);
      err_att++;
      continue;
    }
    const ttId = tts[0].id;
    // find or create course
    const [courses] = await conn.execute(
      "SELECT id FROM training_courses WHERE title = ? AND training_type_id = ? LIMIT 1",
      [courseTitle, ttId]
    );
    let courseId;
    if ((courses || []).length > 0) courseId = courses[0].id;
    else {
      const [res] = await conn.execute(
        "INSERT INTO training_courses (title, training_type_id, provider, course_date, modality, duration_hours, status, created_by) VALUES (?,?,?,?,?,?,?,?)",
        [
          courseTitle,
          ttId,
          r["enteformatore"] || null,
          toSqlDate(r["datacorso"]),
          "presenza",
          r["durataore"] ? Number(r["durataore"]) : null,
          "completato",
          1,
        ]
      );
      courseId = res.insertId;
    }
    // insert certificate
    await conn.execute(
      "INSERT INTO training_certificates (worker_id, course_id, certificate_number, issue_date, expiry_date, validity_status, notes, created_by) VALUES (?,?,?,?,?,?,?,?)",
      [
        workerId,
        courseId,
        r["numeroattestato"] || null,
        toSqlDate(r["datacorso"]),
        toSqlDate(r["datascadenza"]),
        "valido",
        r["note"] || null,
        1,
      ]
    );
    ins_att++;
  }
  results.push({
    type: "attestati",
    inserted: ins_att,
    errors: err_att,
    total: att.out.length,
  });

  // VISITE
  const visPath = path.join(process.cwd(), "tmp", "visite_test.xlsx");
  const vis = readFileRows(visPath);
  console.log("Visite headers:", vis.rawHeaders);
  let ins_vis = 0;
  let err_vis = 0;
  for (let i = 0; i < vis.out.length; i++) {
    const r = vis.out[i];
    const rowNum = i + 2;
    const lastName = r["cognome"];
    const firstName = r["nome"];
    const visitType = r["tipovisita"];
    if (!lastName || !firstName || !visitType) {
      console.log(`Vis row ${rowNum} missing req`);
      err_vis++;
      continue;
    }
    // Normalize visit type and judgment to allowed enums
    let vt = (visitType || "").toLowerCase();
    if (vt.includes("periodica")) vt = "periodica";
    else if (vt.includes("rientro")) vt = "rientro_malattia";
    else if (vt.includes("visita") && vt.includes("iniziale"))
      vt = "preassuntiva";
    else vt = vt;
    let judgment = (r["giudizio"] || "").toLowerCase();
    if (judgment.includes("idoneo") && judgment.includes("limit"))
      judgment = "idoneo_limitazioni";
    else if (judgment.includes("idoneo")) judgment = "idoneo";
    else judgment = judgment || null;
    const [ws] = await conn.execute(
      'SELECT id FROM workers WHERE last_name = ? AND first_name = ? AND status = "attivo" LIMIT 1',
      [lastName, firstName]
    );
    if ((ws || []).length === 0) {
      console.log(`Vis row ${rowNum} worker not found`);
      err_vis++;
      continue;
    }
    const workerId = ws[0].id;
    await conn.execute(
      "INSERT INTO medical_visits (worker_id, visit_type, doctor_name, visit_date, next_visit_due, judgment, limitation_description, prescription_description, health_protocol, request_status, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        workerId,
        vt,
        r["medicocompetente"] || null,
        toSqlDate(r["datavisita"]),
        toSqlDate(r["prossimavisita"]),
        judgment,
        r["limitazioni"] || null,
        r["prescrizioni"] || null,
        r["protocollo"] || null,
        "completata",
        r["note"] || null,
        1,
      ]
    );
    ins_vis++;
  }
  results.push({
    type: "visite",
    inserted: ins_vis,
    errors: err_vis,
    total: vis.out.length,
  });

  console.log("IMPORT RESULTS:", results);
  await conn.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
