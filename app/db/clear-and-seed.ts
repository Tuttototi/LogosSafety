import { getDb } from "../api/queries/connection";
import {
  companies, sites, jobRoles, risks, jobRoleRisks,
  trainingTypes, jobRoleTraining, workers, trainingCourses,
  trainingCertificates, medicalVisits, documents, alerts,
} from "./schema";

async function clearAndSeed() {
  const db = getDb();
  console.log("Clearing existing data...");
  const requireId = (id: number | undefined, entity: string): number => {
    if (id === undefined) {
      throw new Error(`Missing seed dependency: ${entity}`);
    }
    return id;
  };

  // Delete in reverse order to avoid FK constraints
  await db.delete(alerts);
  await db.delete(documents);
  await db.delete(trainingCertificates);
  await db.delete(medicalVisits);
  await db.delete(trainingCourses);
  await db.delete(workers);
  await db.delete(jobRoleTraining);
  await db.delete(jobRoleRisks);
  await db.delete(jobRoles);
  await db.delete(trainingTypes);
  await db.delete(risks);
  await db.delete(sites);
  await db.delete(companies);

  console.log("All tables cleared. Seeding...");

  // ─── 1. Companies ──────────────────────────────────────────
  const compVals = [
    { name: "Edilizia Nord Srl", vatNumber: "12345678901", city: "Milano", province: "MI" },
    { name: "Cooperativa Lavoro Sicuro", vatNumber: "23456789012", city: "Bologna", province: "BO" },
    { name: "Metalmeccanica Sud Spa", vatNumber: "34567890123", city: "Bari", province: "BA" },
  ];
  await db.insert(companies).values(compVals);
  const allCompanies = await db.select().from(companies);
  console.log(`Inserted ${allCompanies.length} companies`);

  // ─── 2. Sites ──────────────────────────────────────────────
  const siteVals = [
    { companyId: allCompanies[0].id, name: "Cantiere Centro Commerciale", city: "Milano", province: "MI", address: "Via Roma 123" },
    { companyId: allCompanies[0].id, name: "Cantiere Residenziale Porta Nuova", city: "Milano", province: "MI", address: "Corso Como 45" },
    { companyId: allCompanies[1].id, name: "Sede Centrale", city: "Bologna", province: "BO", address: "Via dell'Indipendenza 88" },
    { companyId: allCompanies[1].id, name: "Cantiere Autostrada A14", city: "Rimini", province: "RN", address: "Km 245 A14" },
    { companyId: allCompanies[2].id, name: "Stabilimento Principale", city: "Bari", province: "BA", address: "Via delle Industrie 7" },
  ];
  await db.insert(sites).values(siteVals);
  const allSites = await db.select().from(sites);
  console.log(`Inserted ${allSites.length} sites`);

  // ─── 3. Risks ──────────────────────────────────────────────
  const riskVals = [
    { code: "RISCHIO_CADUTE", name: "Rischio cadute dall'alto", category: "Cadute" },
    { code: "RISCHIO_MMC", name: "Rischio movimentazione carichi", category: "Manuali" },
    { code: "RISCHIO_RUMORE", name: "Rischio rumore", category: "Fisici" },
    { code: "RISCHIO_VDT", name: "Rischio videoterminali", category: "Posturali" },
    { code: "RISCHIO_CHIMICO", name: "Rischio agenti chimici", category: "Chimici" },
    { code: "RISCHIO_ELETTRICO", name: "Rischio elettrico", category: "Elettrici" },
    { code: "RISCHIO_INCENDIO", name: "Rischio incendio/esplosione", category: "Ambientali" },
    { code: "RISCHIO_SPAZI_CONF", name: "Rischio spazi confinati", category: "Ambientali" },
    { code: "RISCHIO_NOTTURNO", name: "Lavoro notturno", category: "Organizzativi" },
    { code: "RISCHIO_RIBALTA", name: "Rischio ribaltamento mezzi", category: "Mezzi" },
  ];
  await db.insert(risks).values(riskVals);
  const allRisks = await db.select().from(risks);
  console.log(`Inserted ${allRisks.length} risks`);

  // ─── 4. Training Types ─────────────────────────────────────
  const ttVals = [
    { code: "FORM_GEN", name: "Formazione Generale", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Base" },
    { code: "FORM_SPEC_B", name: "Formazione Specifica Basso Rischio", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Specifica" },
    { code: "FORM_SPEC_M", name: "Formazione Specifica Medio Rischio", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Specifica" },
    { code: "FORM_SPEC_A", name: "Formazione Specifica Alto Rischio", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Specifica" },
    { code: "PREPOSTO", name: "Formazione Preposti", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Dirigenza" },
    { code: "DIRIGENTE", name: "Formazione Dirigenti", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Dirigenza" },
    { code: "CARRELLI", name: "Abilitazione Carrelli Elevatori", normativeReference: "D.Lgs. 81/08 Art. 73", defaultValidityMonths: 60, category: "Attrezzature" },
    { code: "PLE", name: "Abilitazione Piattaforme Elevabili (PLE)", normativeReference: "D.Lgs. 81/08 Art. 73", defaultValidityMonths: 60, category: "Attrezzature" },
    { code: "GRU", name: "Abilitazione Gru", normativeReference: "D.Lgs. 81/08 Art. 73", defaultValidityMonths: 60, category: "Attrezzature" },
    { code: "ANTINCENDIO", name: "Formazione Antincendio", normativeReference: "D.M. 10/03/1998", defaultValidityMonths: 60, category: "Emergenza" },
    { code: "PRIMO_SOCCORSO", name: "Formazione Primo Soccorso", normativeReference: "D.M. 388/2003", defaultValidityMonths: 36, category: "Emergenza" },
    { code: "SPAzi_CONF", name: "Spazi Confinati", normativeReference: "D.Lgs. 81/08 Art. 68", defaultValidityMonths: 60, category: "Specialistica" },
    { code: "DATORE", name: "Formazione Datore di Lavoro RSPP", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Dirigenza" },
    { code: "RLS", name: "Formazione Rappresentante Lavoratori Sicurezza", normativeReference: "Accordo Stato-Regioni 21/12/2011", defaultValidityMonths: 60, category: "Rappresentanza" },
  ];
  await db.insert(trainingTypes).values(ttVals);
  const allTrainingTypes = await db.select().from(trainingTypes);
  console.log(`Inserted ${allTrainingTypes.length} training types`);

  // ─── 5. Job Roles ──────────────────────────────────────────
  const jrVals = [
    { name: "Operaio Edile", description: "Operaio generico edilizia", riskLevel: "medio" as const, requiresMedicalVisit: true },
    { name: "Carpentiere", description: "Carpentiere legno/metallo", riskLevel: "medio" as const, requiresMedicalVisit: true },
    { name: "Magazziniere", description: "Gestione magazzino e materiali", riskLevel: "medio" as const, requiresMedicalVisit: true },
    { name: "Carrellista", description: "Conduzione carrelli elevatori", riskLevel: "medio" as const, requiresMedicalVisit: true },
    { name: "Addetto PLE", description: "Operatore piattaforme elevabili", riskLevel: "alto" as const, requiresMedicalVisit: true },
    { name: "Preposto", description: "Preposto sicurezza cantiere", riskLevel: "medio" as const, requiresMedicalVisit: true },
    { name: "Impiegato Ufficio", description: "Impiegato amministrativo", riskLevel: "basso" as const, requiresMedicalVisit: false },
    { name: "Muratore", description: "Muratore specializzato", riskLevel: "medio" as const, requiresMedicalVisit: true },
    { name: "Elettricista", description: "Installazione e manutenzione elettrica", riskLevel: "alto" as const, requiresMedicalVisit: true },
    { name: "Manovratore Gru", description: "Conduzione gru edile", riskLevel: "alto" as const, requiresMedicalVisit: true },
    { name: "Responsabile HSE", description: "Responsabile sicurezza", riskLevel: "basso" as const, requiresMedicalVisit: false },
    { name: "Operaio Generico", description: "Operaio non specializzato", riskLevel: "medio" as const, requiresMedicalVisit: true },
  ];
  await db.insert(jobRoles).values(jrVals);
  const allJobRoles = await db.select().from(jobRoles);
  console.log(`Inserted ${allJobRoles.length} job roles`);

  // Helper functions
  const getRiskId = (code: string) =>
    requireId(allRisks.find((r) => r.code === code)?.id, `risk ${code}`);
  const getRoleId = (name: string) =>
    requireId(allJobRoles.find((r) => r.name === name)?.id, `job role ${name}`);
  const getTTId = (code: string) =>
    requireId(allTrainingTypes.find((t) => t.code === code)?.id, `training type ${code}`);

  // ─── 6. Job Role - Risks mapping ───────────────────────────
  const jrrVals = [
    { jobRoleId: getRoleId("Operaio Edile"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Operaio Edile"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Operaio Edile"), riskId: getRiskId("RISCHIO_RUMORE") },
    { jobRoleId: getRoleId("Carpentiere"), riskId: getRiskId("RISCHIO_RUMORE") },
    { jobRoleId: getRoleId("Carpentiere"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Magazziniere"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Magazziniere"), riskId: getRiskId("RISCHIO_RIBALTA") },
    { jobRoleId: getRoleId("Carrellista"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Carrellista"), riskId: getRiskId("RISCHIO_RIBALTA") },
    { jobRoleId: getRoleId("Addetto PLE"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Addetto PLE"), riskId: getRiskId("RISCHIO_RUMORE") },
    { jobRoleId: getRoleId("Addetto PLE"), riskId: getRiskId("RISCHIO_ELETTRICO") },
    { jobRoleId: getRoleId("Preposto"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Preposto"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Impiegato Ufficio"), riskId: getRiskId("RISCHIO_VDT") },
    { jobRoleId: getRoleId("Muratore"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Muratore"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Muratore"), riskId: getRiskId("RISCHIO_RUMORE") },
    { jobRoleId: getRoleId("Elettricista"), riskId: getRiskId("RISCHIO_ELETTRICO") },
    { jobRoleId: getRoleId("Elettricista"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Manovratore Gru"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Manovratore Gru"), riskId: getRiskId("RISCHIO_MMC") },
    { jobRoleId: getRoleId("Manovratore Gru"), riskId: getRiskId("RISCHIO_RUMORE") },
    { jobRoleId: getRoleId("Responsabile HSE"), riskId: getRiskId("RISCHIO_VDT") },
    { jobRoleId: getRoleId("Operaio Generico"), riskId: getRiskId("RISCHIO_CADUTE") },
    { jobRoleId: getRoleId("Operaio Generico"), riskId: getRiskId("RISCHIO_MMC") },
  ];
  await db.insert(jobRoleRisks).values(jrrVals);
  console.log(`Inserted ${jrrVals.length} job role risk mappings`);

  // ─── 7. Job Role - Training mapping ────────────────────────
  const jrtVals = [
    { jobRoleId: getRoleId("Operaio Edile"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Operaio Edile"), trainingTypeId: getTTId("FORM_SPEC_M") },
    { jobRoleId: getRoleId("Carpentiere"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Carpentiere"), trainingTypeId: getTTId("FORM_SPEC_M") },
    { jobRoleId: getRoleId("Magazziniere"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Magazziniere"), trainingTypeId: getTTId("FORM_SPEC_M") },
    { jobRoleId: getRoleId("Carrellista"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Carrellista"), trainingTypeId: getTTId("FORM_SPEC_M") },
    { jobRoleId: getRoleId("Carrellista"), trainingTypeId: getTTId("CARRELLI") },
    { jobRoleId: getRoleId("Addetto PLE"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Addetto PLE"), trainingTypeId: getTTId("FORM_SPEC_A") },
    { jobRoleId: getRoleId("Addetto PLE"), trainingTypeId: getTTId("PLE") },
    { jobRoleId: getRoleId("Preposto"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Preposto"), trainingTypeId: getTTId("FORM_SPEC_M") },
    { jobRoleId: getRoleId("Preposto"), trainingTypeId: getTTId("PREPOSTO") },
    { jobRoleId: getRoleId("Impiegato Ufficio"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Impiegato Ufficio"), trainingTypeId: getTTId("FORM_SPEC_B") },
    { jobRoleId: getRoleId("Muratore"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Muratore"), trainingTypeId: getTTId("FORM_SPEC_M") },
    { jobRoleId: getRoleId("Elettricista"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Elettricista"), trainingTypeId: getTTId("FORM_SPEC_A") },
    { jobRoleId: getRoleId("Manovratore Gru"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Manovratore Gru"), trainingTypeId: getTTId("FORM_SPEC_A") },
    { jobRoleId: getRoleId("Manovratore Gru"), trainingTypeId: getTTId("GRU") },
    { jobRoleId: getRoleId("Responsabile HSE"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Responsabile HSE"), trainingTypeId: getTTId("DATORE") },
    { jobRoleId: getRoleId("Operaio Generico"), trainingTypeId: getTTId("FORM_GEN") },
    { jobRoleId: getRoleId("Operaio Generico"), trainingTypeId: getTTId("FORM_SPEC_M") },
  ];
  await db.insert(jobRoleTraining).values(jrtVals);
  console.log(`Inserted ${jrtVals.length} job role training mappings`);

  // ─── 8. Workers ────────────────────────────────────────────
  const workerData = [
    { firstName: "Marco", lastName: "Rossi", fiscalCode: "RSSMRC85A01H501Z", companyId: allCompanies[0].id, siteId: allSites[0].id, jobRoleId: getRoleId("Operaio Edile"), hireDate: "2023-01-15", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Giuseppe", lastName: "Bianchi", fiscalCode: "BNCGPP78B02F205X", companyId: allCompanies[0].id, siteId: allSites[0].id, jobRoleId: getRoleId("Carrellista"), hireDate: "2022-06-01", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Anna", lastName: "Verdi", fiscalCode: "VRDNNA90C41A662Y", companyId: allCompanies[0].id, siteId: allSites[1].id, jobRoleId: getRoleId("Addetto PLE"), hireDate: "2024-03-10", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Luca", lastName: "Neri", fiscalCode: "NRILCU82D15H501W", companyId: allCompanies[0].id, siteId: allSites[0].id, jobRoleId: getRoleId("Preposto"), hireDate: "2021-09-01", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Paolo", lastName: "Ferrari", fiscalCode: "FRRPLA75E20F205V", companyId: allCompanies[1].id, siteId: allSites[2].id, jobRoleId: getRoleId("Muratore"), hireDate: "2023-05-20", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Sara", lastName: "Fontana", fiscalCode: "FNTSRA88F51H501T", companyId: allCompanies[1].id, siteId: allSites[3].id, jobRoleId: getRoleId("Elettricista"), hireDate: "2024-01-08", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Andrea", lastName: "Galli", fiscalCode: "GLLNDR91G30A662S", companyId: allCompanies[1].id, siteId: allSites[2].id, jobRoleId: getRoleId("Impiegato Ufficio"), hireDate: "2022-11-15", requiresMedicalVisit: false, status: "attivo" as const },
    { firstName: "Chiara", lastName: "Conti", fiscalCode: "CNTCHR87H45F205R", companyId: allCompanies[2].id, siteId: allSites[4].id, jobRoleId: getRoleId("Manovratore Gru"), hireDate: "2023-08-01", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Roberto", lastName: "Mancini", fiscalCode: "MNCRRT80I15H501Q", companyId: allCompanies[2].id, siteId: allSites[4].id, jobRoleId: getRoleId("Carpentiere"), hireDate: "2021-04-12", requiresMedicalVisit: true, status: "sospeso" as const },
    { firstName: "Elena", lastName: "Ricci", fiscalCode: "RCCLNE92J60A662P", companyId: allCompanies[0].id, siteId: allSites[1].id, jobRoleId: getRoleId("Magazziniere"), hireDate: "2024-06-01", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Davide", lastName: "Moretti", fiscalCode: "MRTDVD79K22F205N", companyId: allCompanies[2].id, siteId: allSites[4].id, jobRoleId: getRoleId("Operaio Generico"), hireDate: "2023-02-28", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Francesca", lastName: "Bruno", fiscalCode: "BRNFRN86L42H501M", companyId: allCompanies[1].id, siteId: allSites[3].id, jobRoleId: getRoleId("Operaio Edile"), hireDate: "2024-09-15", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Stefano", lastName: "Greco", fiscalCode: "GRCSTN83M10A662L", companyId: allCompanies[0].id, siteId: allSites[0].id, jobRoleId: getRoleId("Addetto PLE"), hireDate: "2022-07-15", requiresMedicalVisit: true, status: "attivo" as const },
    { firstName: "Laura", lastName: "Lombardi", fiscalCode: "LBMLRA89N55F205K", companyId: allCompanies[2].id, siteId: allSites[4].id, jobRoleId: getRoleId("Responsabile HSE"), hireDate: "2020-01-10", requiresMedicalVisit: false, status: "attivo" as const },
    { firstName: "Matteo", lastName: "Rinaldi", fiscalCode: "RNIMTT77O33H501J", companyId: allCompanies[0].id, siteId: allSites[0].id, jobRoleId: getRoleId("Preposto"), hireDate: "2021-03-20", requiresMedicalVisit: true, status: "attivo" as const },
  ];
  await db.insert(workers).values(workerData);
  const allWorkers = await db.select().from(workers);
  console.log(`Inserted ${allWorkers.length} workers`);

  // ─── 9. Training Courses ───────────────────────────────────
  const courseVals = [
    { title: "Corso Formazione Generale - Marzo 2024", trainingTypeId: getTTId("FORM_GEN"), provider: "ProSafety Srl", normativeReference: "Accordo Stato-Regioni 21/12/2011", durationHours: 4, modality: "presenza" as const, courseDate: "2024-03-15", status: "completato" as const },
    { title: "Corso Formazione Specifica Medio Rischio", trainingTypeId: getTTId("FORM_SPEC_M"), provider: "SicurForma", normativeReference: "Accordo Stato-Regioni 21/12/2011", durationHours: 8, modality: "mista" as const, courseDate: "2024-04-10", status: "completato" as const },
    { title: "Abilitazione Carrelli Elevatori", trainingTypeId: getTTId("CARRELLI"), provider: "CFS Centro Formazione", normativeReference: "D.Lgs. 81/08 Art. 73", durationHours: 12, modality: "presenza" as const, courseDate: "2024-02-20", status: "completato" as const },
    { title: "Corso Preposti Sicurezza", trainingTypeId: getTTId("PREPOSTO"), provider: "HSE Academy", normativeReference: "Accordo Stato-Regioni 21/12/2011", durationHours: 16, modality: "presenza" as const, courseDate: "2024-01-15", status: "completato" as const },
    { title: "Abilitazione PLE", trainingTypeId: getTTId("PLE"), provider: "Elevated Training", normativeReference: "D.Lgs. 81/08 Art. 73", durationHours: 8, modality: "presenza" as const, courseDate: "2025-01-10", status: "completato" as const },
    { title: "Corso Antincendio Rischio Medio", trainingTypeId: getTTId("ANTINCENDIO"), provider: "Vigili del Fuoco - Formazione", normativeReference: "D.M. 10/03/1998", durationHours: 8, modality: "presenza" as const, courseDate: "2024-05-20", status: "completato" as const },
    { title: "Corso Primo Soccorso", trainingTypeId: getTTId("PRIMO_SOCCORSO"), provider: "Croce Rossa", normativeReference: "D.M. 388/2003", durationHours: 6, modality: "presenza" as const, courseDate: "2024-06-12", status: "completato" as const },
    { title: "Formazione Specifica Basso Rischio", trainingTypeId: getTTId("FORM_SPEC_B"), provider: "ProSafety Srl", normativeReference: "Accordo Stato-Regioni 21/12/2011", durationHours: 4, modality: "e_learning" as const, courseDate: "2024-08-05", status: "completato" as const },
    { title: "Formazione Specifica Alto Rischio", trainingTypeId: getTTId("FORM_SPEC_A"), provider: "SicurForma Plus", normativeReference: "Accordo Stato-Regioni 21/12/2011", durationHours: 12, modality: "presenza" as const, courseDate: "2025-02-01", status: "completato" as const },
    { title: "Abilitazione Gru Edile", trainingTypeId: getTTId("GRU"), provider: "EdilForma", normativeReference: "D.Lgs. 81/08 Art. 73", durationHours: 20, modality: "presenza" as const, courseDate: "2024-09-15", status: "completato" as const },
    { title: "Formazione Datore di Lavoro", trainingTypeId: getTTId("DATORE"), provider: "HSE Academy", normativeReference: "Accordo Stato-Regioni 21/12/2011", durationHours: 16, modality: "mista" as const, courseDate: "2024-03-01", status: "completato" as const },
  ];
  await db.insert(trainingCourses).values(courseVals);
  const allCourses = await db.select().from(trainingCourses);
  console.log(`Inserted ${allCourses.length} courses`);

  // ─── 10. Training Certificates ─────────────────────────────
  const findCourse = (title: string) =>
    requireId(allCourses.find((c) => c.title.includes(title))?.id, `course ${title}`);
  const findWorker = (first: string, last: string) =>
    requireId(
      allWorkers.find((w) => w.firstName === first && w.lastName === last)?.id,
      `worker ${first} ${last}`,
    );

  const certVals = [
    { workerId: findWorker("Marco", "Rossi"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2024-001", issueDate: "2024-03-15", expiryDate: "2029-03-15", validityStatus: "valido" as const },
    { workerId: findWorker("Marco", "Rossi"), courseId: findCourse("Formazione Specifica Medio Rischio"), certificateNumber: "FSM-2024-015", issueDate: "2024-04-10", expiryDate: "2029-04-10", validityStatus: "valido" as const },
    { workerId: findWorker("Giuseppe", "Bianchi"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2023-042", issueDate: "2023-06-05", expiryDate: "2025-06-05", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Giuseppe", "Bianchi"), courseId: findCourse("Formazione Specifica Medio Rischio"), certificateNumber: "FSM-2023-038", issueDate: "2023-07-12", expiryDate: "2028-07-12", validityStatus: "valido" as const },
    { workerId: findWorker("Giuseppe", "Bianchi"), courseId: findCourse("Carrelli Elevatori"), certificateNumber: "CAR-2024-008", issueDate: "2024-02-25", expiryDate: "2029-02-25", validityStatus: "valido" as const },
    { workerId: findWorker("Anna", "Verdi"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2025-089", issueDate: "2025-03-15", expiryDate: "2030-03-15", validityStatus: "valido" as const },
    { workerId: findWorker("Anna", "Verdi"), courseId: findCourse("Formazione Specifica Alto Rischio"), certificateNumber: "FSA-2025-003", issueDate: "2025-02-05", expiryDate: "2030-02-05", validityStatus: "valido" as const },
    { workerId: findWorker("Anna", "Verdi"), courseId: findCourse("PLE"), certificateNumber: "PLE-2025-012", issueDate: "2025-01-15", expiryDate: "2030-01-15", validityStatus: "valido" as const },
    { workerId: findWorker("Luca", "Neri"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2022-015", issueDate: "2022-10-01", expiryDate: "2025-10-01", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Luca", "Neri"), courseId: findCourse("Formazione Specifica Medio Rischio"), certificateNumber: "FSM-2023-022", issueDate: "2023-05-15", expiryDate: "2028-05-15", validityStatus: "valido" as const },
    { workerId: findWorker("Luca", "Neri"), courseId: findCourse("Preposti Sicurezza"), certificateNumber: "PRE-2024-001", issueDate: "2024-01-20", expiryDate: "2029-01-20", validityStatus: "valido" as const },
    { workerId: findWorker("Paolo", "Ferrari"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2023-067", issueDate: "2023-05-25", expiryDate: "2028-05-25", validityStatus: "valido" as const },
    { workerId: findWorker("Paolo", "Ferrari"), courseId: findCourse("Formazione Specifica Medio Rischio"), certificateNumber: "FSM-2023-071", issueDate: "2023-06-18", expiryDate: "2025-06-18", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Sara", "Fontana"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2025-112", issueDate: "2025-01-15", expiryDate: "2030-01-15", validityStatus: "valido" as const },
    { workerId: findWorker("Sara", "Fontana"), courseId: findCourse("Formazione Specifica Alto Rischio"), certificateNumber: "FSA-2025-008", issueDate: "2025-02-10", expiryDate: "2030-02-10", validityStatus: "valido" as const },
    { workerId: findWorker("Andrea", "Galli"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2023-091", issueDate: "2023-02-01", expiryDate: "2028-02-01", validityStatus: "valido" as const },
    { workerId: findWorker("Andrea", "Galli"), courseId: findCourse("Formazione Specifica Basso Rischio"), certificateNumber: "FSB-2024-045", issueDate: "2024-08-10", expiryDate: "2029-08-10", validityStatus: "valido" as const },
    { workerId: findWorker("Chiara", "Conti"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2023-078", issueDate: "2023-08-15", expiryDate: "2028-08-15", validityStatus: "valido" as const },
    { workerId: findWorker("Chiara", "Conti"), courseId: findCourse("Formazione Specifica Alto Rischio"), certificateNumber: "FSA-2023-019", issueDate: "2023-09-20", expiryDate: "2025-09-20", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Chiara", "Conti"), courseId: findCourse("Gru Edile"), certificateNumber: "GRU-2024-005", issueDate: "2024-09-25", expiryDate: "2029-09-25", validityStatus: "valido" as const },
    { workerId: findWorker("Roberto", "Mancini"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2022-033", issueDate: "2022-04-20", expiryDate: "2024-04-20", validityStatus: "scaduto" as const },
    { workerId: findWorker("Davide", "Moretti"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2023-055", issueDate: "2023-03-10", expiryDate: "2028-03-10", validityStatus: "valido" as const },
    { workerId: findWorker("Davide", "Moretti"), courseId: findCourse("Formazione Specifica Medio Rischio"), certificateNumber: "FSM-2023-060", issueDate: "2023-04-05", expiryDate: "2025-04-05", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Francesca", "Bruno"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2025-130", issueDate: "2025-01-20", expiryDate: "2030-01-20", validityStatus: "valido" as const },
    { workerId: findWorker("Stefano", "Greco"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2023-041", issueDate: "2023-07-20", expiryDate: "2025-07-20", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Stefano", "Greco"), courseId: findCourse("Formazione Specifica Alto Rischio"), certificateNumber: "FSA-2023-025", issueDate: "2023-08-10", expiryDate: "2028-08-10", validityStatus: "valido" as const },
    { workerId: findWorker("Stefano", "Greco"), courseId: findCourse("PLE"), certificateNumber: "PLE-2024-018", issueDate: "2024-03-05", expiryDate: "2029-03-05", validityStatus: "valido" as const },
    { workerId: findWorker("Laura", "Lombardi"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2021-012", issueDate: "2021-02-15", expiryDate: "2026-02-15", validityStatus: "valido" as const },
    { workerId: findWorker("Laura", "Lombardi"), courseId: findCourse("Datore di Lavoro"), certificateNumber: "DAT-2024-003", issueDate: "2024-03-10", expiryDate: "2029-03-10", validityStatus: "valido" as const },
    { workerId: findWorker("Matteo", "Rinaldi"), courseId: findCourse("Formazione Generale"), certificateNumber: "FG-2022-028", issueDate: "2022-03-25", expiryDate: "2025-03-25", validityStatus: "in_scadenza" as const },
    { workerId: findWorker("Matteo", "Rinaldi"), courseId: findCourse("Formazione Specifica Medio Rischio"), certificateNumber: "FSM-2023-035", issueDate: "2023-06-01", expiryDate: "2028-06-01", validityStatus: "valido" as const },
    { workerId: findWorker("Matteo", "Rinaldi"), courseId: findCourse("Preposti Sicurezza"), certificateNumber: "PRE-2024-008", issueDate: "2024-04-15", expiryDate: "2029-04-15", validityStatus: "valido" as const },
  ];
  await db.insert(trainingCertificates).values(certVals);
  console.log(`Inserted ${certVals.length} certificates`);

  // ─── 11. Medical Visits ────────────────────────────────────
  const visitVals = [
    { workerId: findWorker("Marco", "Rossi"), visitType: "periodica" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo edilizia", requestDate: "2025-01-10", scheduledDate: "2025-01-20", visitDate: "2025-01-20", judgment: "idoneo" as const, nextVisitDue: "2026-01-20", requestStatus: "completata" as const },
    { workerId: findWorker("Giuseppe", "Bianchi"), visitType: "periodica" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo MMC", requestDate: "2025-02-05", scheduledDate: "2025-02-15", visitDate: "2025-02-15", judgment: "idoneo" as const, nextVisitDue: "2026-02-15", requestStatus: "completata" as const },
    { workerId: findWorker("Anna", "Verdi"), visitType: "preassuntiva" as const, doctorName: "Dr. Laura Benedetti", healthProtocol: "Protocollo PLE/alto rischio", requestDate: "2024-03-01", scheduledDate: "2024-03-08", visitDate: "2024-03-08", judgment: "idoneo" as const, nextVisitDue: "2025-03-08", requestStatus: "completata" as const },
    { workerId: findWorker("Luca", "Neri"), visitType: "periodica" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo preposti", requestDate: "2024-10-01", scheduledDate: "2024-10-10", visitDate: "2024-10-10", judgment: "idoneo_prescrizioni" as const, nextVisitDue: "2025-10-10", requestStatus: "completata" as const, limitationDescription: "Controllo PA annuale" },
    { workerId: findWorker("Paolo", "Ferrari"), visitType: "periodica" as const, doctorName: "Dr. Marco Ferretti", healthProtocol: "Protocollo edilizia", requestDate: "2025-06-01", scheduledDate: "2025-06-10", visitDate: "2025-06-10", judgment: "idoneo" as const, nextVisitDue: "2026-06-10", requestStatus: "completata" as const },
    { workerId: findWorker("Sara", "Fontana"), visitType: "preassuntiva" as const, doctorName: "Dr. Laura Benedetti", healthProtocol: "Protocollo elettricisti", requestDate: "2024-12-15", scheduledDate: "2025-01-10", visitDate: "2025-01-10", judgment: "idoneo" as const, nextVisitDue: "2026-01-10", requestStatus: "completata" as const },
    { workerId: findWorker("Andrea", "Galli"), visitType: "preventiva" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo VDT", requestDate: "2024-06-01", scheduledDate: "2024-06-15", visitDate: "2024-06-15", judgment: "idoneo" as const, nextVisitDue: "2026-06-15", requestStatus: "completata" as const },
    { workerId: findWorker("Chiara", "Conti"), visitType: "periodica" as const, doctorName: "Dr. Laura Benedetti", healthProtocol: "Protocollo gru", requestDate: "2025-08-01", scheduledDate: "2025-08-10", visitDate: "2025-08-10", judgment: "idoneo_limitazioni" as const, nextVisitDue: "2026-08-10", requestStatus: "completata" as const, limitationDescription: "Non sollevare carichi >25kg" },
    { workerId: findWorker("Roberto", "Mancini"), visitType: "periodica" as const, doctorName: "Dr. Marco Ferretti", healthProtocol: "Protocollo carpenteria", requestDate: "2024-04-01", scheduledDate: "2024-04-15", visitDate: "2024-04-15", judgment: "temp_non_idoneo" as const, nextVisitDue: "2024-10-15", requestStatus: "completata" as const, limitationDescription: "Riposo 3 mesi per problema articolare" },
    { workerId: findWorker("Elena", "Ricci"), visitType: "preassuntiva" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo magazzino", requestDate: "2025-05-15", scheduledDate: "2025-05-25", visitDate: "2025-05-25", judgment: "idoneo" as const, nextVisitDue: "2026-05-25", requestStatus: "completata" as const },
    { workerId: findWorker("Davide", "Moretti"), visitType: "periodica" as const, doctorName: "Dr. Marco Ferretti", healthProtocol: "Protocollo generale", requestDate: "2025-03-01", scheduledDate: "2025-03-10", visitDate: "2025-03-10", judgment: "idoneo" as const, nextVisitDue: "2026-03-10", requestStatus: "completata" as const },
    { workerId: findWorker("Francesca", "Bruno"), visitType: "preassuntiva" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo edilizia", requestDate: "2025-01-10", scheduledDate: "2025-01-18", visitDate: "2025-01-18", judgment: "idoneo" as const, nextVisitDue: "2026-01-18", requestStatus: "completata" as const },
    { workerId: findWorker("Stefano", "Greco"), visitType: "periodica" as const, doctorName: "Dr. Laura Benedetti", healthProtocol: "Protocollo PLE", requestDate: "2024-04-01", scheduledDate: "2024-04-10", visitDate: "2024-04-10", judgment: "idoneo" as const, nextVisitDue: "2025-04-10", requestStatus: "completata" as const },
    { workerId: findWorker("Laura", "Lombardi"), visitType: "preventiva" as const, doctorName: "Dr. Mario Rossetti", healthProtocol: "Protocollo VDT", requestDate: "2024-08-01", scheduledDate: "2024-08-15", visitDate: "2024-08-15", judgment: "idoneo" as const, nextVisitDue: "2026-08-15", requestStatus: "completata" as const },
    { workerId: findWorker("Matteo", "Rinaldi"), visitType: "periodica" as const, doctorName: "Dr. Marco Ferretti", healthProtocol: "Protocollo preposti", requestDate: "2025-04-01", scheduledDate: "2025-04-10", visitDate: "2025-04-10", judgment: "idoneo" as const, nextVisitDue: "2026-04-10", requestStatus: "completata" as const },
  ];
  await db.insert(medicalVisits).values(visitVals);
  console.log(`Inserted ${visitVals.length} medical visits`);

  // ─── 12. Alerts ────────────────────────────────────────────
  const alertVals = [
    { workerId: findWorker("Roberto", "Mancini"), alertType: "non_conforme" as const, description: "Formazione generale scaduta da 14 mesi", severity: "critica" as const, dueDate: "2024-04-20" },
    { workerId: findWorker("Elena", "Ricci"), alertType: "formazione_mancante" as const, description: "Formazione specifica media mancante", severity: "alta" as const, dueDate: "2025-07-01" },
    { workerId: findWorker("Giuseppe", "Bianchi"), alertType: "formazione_scadenza" as const, description: "Formazione generale in scadenza tra 30 giorni", severity: "media" as const, dueDate: "2025-06-05" },
    { workerId: findWorker("Luca", "Neri"), alertType: "formazione_scadenza" as const, description: "Formazione generale in scadenza tra 120 giorni", severity: "media" as const, dueDate: "2025-10-01" },
    { workerId: findWorker("Chiara", "Conti"), alertType: "formazione_scadenza" as const, description: "Formazione specifica alto rischio in scadenza", severity: "alta" as const, dueDate: "2025-09-20" },
    { workerId: findWorker("Stefano", "Greco"), alertType: "formazione_scadenza" as const, description: "Formazione generale in scadenza tra 45 giorni", severity: "media" as const, dueDate: "2025-07-20" },
    { workerId: findWorker("Matteo", "Rinaldi"), alertType: "formazione_scadenza" as const, description: "Formazione generale in scadenza", severity: "alta" as const, dueDate: "2025-03-25" },
    { workerId: findWorker("Davide", "Moretti"), alertType: "formazione_scadenza" as const, description: "Formazione specifica media in scadenza", severity: "media" as const, dueDate: "2025-04-05" },
    { workerId: findWorker("Paolo", "Ferrari"), alertType: "formazione_scadenza" as const, description: "Formazione specifica media in scadenza", severity: "media" as const, dueDate: "2025-06-18" },
    { workerId: findWorker("Roberto", "Mancini"), alertType: "visita_mancante" as const, description: "Visita di rientro necessaria dopo sospensione", severity: "alta" as const, dueDate: "2025-04-01" },
  ];
  await db.insert(alerts).values(alertVals);
  console.log(`Inserted ${alertVals.length} alerts`);

  // ─── 13. Documents ─────────────────────────────────────────
  const docVals = [
    { workerId: findWorker("Marco", "Rossi"), entityType: "dipendente" as const, entityId: findWorker("Marco", "Rossi"), documentType: "attestato" as const, title: "Attestato Formazione Generale", fileName: "FG_MarcoRossi_2024.pdf" },
    { workerId: findWorker("Luca", "Neri"), entityType: "dipendente" as const, entityId: findWorker("Luca", "Neri"), documentType: "lettera_incarico" as const, title: "Lettera di Incarico Preposto", fileName: "incarico_preposto_neri.pdf" },
    { workerId: findWorker("Anna", "Verdi"), entityType: "dipendente" as const, entityId: findWorker("Anna", "Verdi"), documentType: "giudizio_idoneita" as const, title: "Giudizio di Idoneita Preassuntiva", fileName: "idoneita_verdi_2024.pdf" },
    { workerId: findWorker("Laura", "Lombardi"), entityType: "dipendente" as const, entityId: findWorker("Laura", "Lombardi"), documentType: "attestato" as const, title: "Attestato RSPP", fileName: "rspp_lombardi_2024.pdf" },
  ];
  await db.insert(documents).values(docVals);
  console.log(`Inserted ${docVals.length} documents`);

  console.log("Seeding complete!");
}

clearAndSeed().catch(console.error);
