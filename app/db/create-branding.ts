import { getDb } from "../api/queries/connection";

async function createBrandingTable() {
  const db = getDb();
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS branding (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      app_name VARCHAR(255) DEFAULT 'Logos Safety',
      logo_url TEXT,
      logo_width INT DEFAULT 140,
      favicon_url TEXT,
      primary_color VARCHAR(20) DEFAULT '#1E40AF',
      primary_hover VARCHAR(20) DEFAULT '#1E3A8A',
      accent_color VARCHAR(20) DEFAULT '#3B82F6',
      sidebar_bg VARCHAR(20) DEFAULT '#FFFFFF',
      sidebar_text VARCHAR(20) DEFAULT '#4B5563',
      sidebar_active_bg VARCHAR(20) DEFAULT '#1E40AF',
      sidebar_active_text VARCHAR(20) DEFAULT '#FFFFFF',
      topbar_bg VARCHAR(20) DEFAULT '#FFFFFF',
      canvas_bg VARCHAR(20) DEFAULT '#F0F2F5',
      status_green VARCHAR(20) DEFAULT '#059669',
      status_yellow VARCHAR(20) DEFAULT '#D97706',
      status_red VARCHAR(20) DEFAULT '#DC2626',
      updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
    )`);
    console.log("Branding table created/exists");

    // Insert default row if empty
    const result = await db.execute(`SELECT COUNT(*) as count FROM branding`);
    const rows = result[0] as unknown as Array<{ count: number | string }>;
    const count = Number(rows[0]?.count ?? 0);
    if (count === 0) {
      await db.execute(`INSERT INTO branding (app_name) VALUES ('Logos Safety')`);
      console.log("Default branding row inserted");
    }
  } catch (error: unknown) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
  }
}

createBrandingTable().catch(console.error);
