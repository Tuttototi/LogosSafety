import {
  bootstrapRealAdmin,
  summarizeRealAdminBootstrap,
} from "../api/dev/real-admin-bootstrap";

async function main() {
  const summary = await bootstrapRealAdmin();
  console.log(JSON.stringify(summarizeRealAdminBootstrap(summary), null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[bootstrap-real-admin] ${message}`);
  process.exitCode = 1;
});
