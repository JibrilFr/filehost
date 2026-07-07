

/**
 * Next.js Instrumentation hook.
 * Runs once when the server starts. We use it to schedule
 * a periodic cleanup of expired files.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[init] Running database migrations...");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const { db } = await import("@/lib/db");
    const { seedDefaultSettings } = await import("@/lib/settings");
    
    try {
      await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });
      console.log("[init] Migrations complete.");
      await seedDefaultSettings();
      console.log("[init] Settings seeded.");
    } catch (error) {
      console.error("[init] Migration failed:", error);
    }

    // Schedule cleanup every hour
    const cron = (await import("node-cron")).default;
    cron.schedule("0 * * * *", async () => {
      try {
        console.log("[cron] Running expired files cleanup...");
        const { cleanupExpiredFiles } = await import("@/lib/cleanup");
        await cleanupExpiredFiles();
        console.log("[cron] Cleanup complete.");
      } catch (error) {
        console.error("[cron] Cleanup failed:", error);
      }
    });

    console.log("[cron] Expiration cleanup scheduled (every hour).");
  }
}
