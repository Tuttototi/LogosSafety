import { getDb } from "./api/queries/connection";

async function fix() {
  const db = getDb();
  await db.execute("UPDATE branding SET app_name = 'Logos Safety' WHERE app_name = 'Nexus Safety'");
  const result = await db.execute("SELECT app_name FROM branding LIMIT 1");
  const rows = result[0] as unknown as Array<{ app_name: string }>;
  console.log("Current app_name:", rows[0]?.app_name ?? "unknown");
}

fix().catch(console.error);
