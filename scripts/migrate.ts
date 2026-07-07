import { db } from "../src/lib/db/index";
import { seedDefaultSettings } from "../src/lib/settings";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  console.log("Running migrations...");
  await migrate(db, {
    migrationsFolder: "./src/lib/db/migrations",
  });
  console.log("Migrations complete.");

  console.log("Seeding default settings...");
  await seedDefaultSettings();
  console.log("Settings seeded.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration/seed failed:", err);
  process.exit(1);
});
