import { db } from "@/lib/db";
import { files, shares, users } from "@/lib/db/schema";
import { eq, lt, and, sql, isNotNull } from "drizzle-orm";
import { getS3Client, getBucket } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Clean up expired files:
 * 1. Find files where expiresAt < now
 * 2. Delete from R2
 * 3. Delete associated shares
 * 4. Update user storage
 * 5. Delete file records
 */
export async function cleanupExpiredFiles() {
  const now = new Date();

  // Find expired files
  const expiredFiles = await db
    .select()
    .from(files)
    .where(
      and(
        isNotNull(files.expiresAt),
        lt(files.expiresAt, now),
        eq(files.uploadStatus, "complete")
      )
    );

  if (expiredFiles.length === 0) {
    return;
  }

  console.log(`[cleanup] Found ${expiredFiles.length} expired files.`);

  const s3 = getS3Client();
  const bucket = getBucket();

  for (const file of expiredFiles) {
    try {
      // Delete from R2
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: file.storageKey })
      );

      // Delete shares
      await db.delete(shares).where(eq(shares.fileId, file.id));

      // Update user storage
      if (file.userId) {
        await db
          .update(users)
          .set({
            storageUsed: sql`GREATEST(${users.storageUsed} - ${file.size}, 0)`,
          })
          .where(eq(users.id, file.userId));
      }

      // Delete file record
      await db.delete(files).where(eq(files.id, file.id));

      console.log(`[cleanup] Deleted expired file: ${file.name}`);
    } catch (error) {
      console.error(
        `[cleanup] Failed to cleanup file ${file.id}:`,
        error
      );
    }
  }

  // Also clean up stale uploads (uploading status for > 24 hours)
  const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleFiles = await db
    .select()
    .from(files)
    .where(
      and(
        eq(files.uploadStatus, "uploading"),
        lt(files.createdAt, staleThreshold)
      )
    );

  for (const file of staleFiles) {
    try {
      await db
        .update(files)
        .set({ uploadStatus: "failed" })
        .where(eq(files.id, file.id));
    } catch (error) {
      console.error(
        `[cleanup] Failed to mark stale upload ${file.id}:`,
        error
      );
    }
  }

  if (staleFiles.length > 0) {
    console.log(
      `[cleanup] Marked ${staleFiles.length} stale uploads as failed.`
    );
  }
}
