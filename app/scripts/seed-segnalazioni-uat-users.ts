import {
  seedSegnalazioniUatUsers,
  summarizeUatSeed,
} from "../api/dev/segnalazioni-uat-users";

async function main() {
  const summary = await seedSegnalazioniUatUsers();
  console.log(JSON.stringify(summarizeUatSeed(summary), null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown UAT seed error";
  console.error(`Segnalazioni UAT seed failed: ${message}`);
  process.exitCode = 1;
});
