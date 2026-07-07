import cron from "node-cron";

/**
 * Next.js Instrumentation hook.
 * Runs once when the server starts. We use it to schedule
 * a periodic cleanup of expired files.
 */
export async function register() {
  // Only run on the server side (not during build or in the browser)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Schedule cleanup every hour
    cron.schedule("0 * * * *", async () => {
      try {
        console.log("[cron] Running expired files cleanup...");
        // Dynamic import to avoid importing DB modules during build
        const { cleanupExpiredFiles } = await import(
          "@/lib/cleanup"
        );
        await cleanupExpiredFiles();
        console.log("[cron] Cleanup complete.");
      } catch (error) {
        console.error("[cron] Cleanup failed:", error);
      }
    });

    console.log("[cron] Expiration cleanup scheduled (every hour).");
  }
}
