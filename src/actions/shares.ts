"use server";

import { db } from "@/lib/db";
import { files, shares } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getS3Client, getBucket } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SharePageData } from "@/types";

/**
 * Get share page data by share ID.
 */
export async function getShareData(
  shareId: string
): Promise<SharePageData | null> {
  const [share] = await db
    .select()
    .from(shares)
    .where(eq(shares.id, shareId))
    .limit(1);

  if (!share || !share.isActive) return null;

  // Check if share has expired
  if (share.expiresAt && share.expiresAt < new Date()) {
    return null;
  }

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, share.fileId))
    .limit(1);

  if (!file || file.uploadStatus !== "complete") return null;

  // Check if file has expired
  if (file.expiresAt && file.expiresAt < new Date()) {
    return null;
  }

  return {
    shareId: share.id,
    fileName: file.name,
    fileSize: file.size,
    downloadCount: file.downloadCount,
    uploadedAt: file.createdAt,
    expiresAt: file.expiresAt || share.expiresAt || null,
  };
}

/**
 * Generate a presigned download URL for a shared file.
 * Uses the S3 native endpoint with response-content-disposition.
 */
export async function getDownloadUrl(shareId: string): Promise<string | null> {
  const [share] = await db
    .select()
    .from(shares)
    .where(eq(shares.id, shareId))
    .limit(1);

  if (!share || !share.isActive) return null;

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, share.fileId))
    .limit(1);

  if (!file || file.uploadStatus !== "complete") return null;

  // Check expiry
  if (file.expiresAt && file.expiresAt < new Date()) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;

  const s3 = getS3Client();
  const bucket = getBucket();

  // Generate presigned URL with Content-Disposition overriding the filename
  // The file.name field is mutable (can be renamed in file manager)
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: file.storageKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
    ResponseContentType: file.mimeType || "application/octet-stream",
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes

  // Increment download count
  await db
    .update(files)
    .set({ downloadCount: sql`${files.downloadCount} + 1` })
    .where(eq(files.id, file.id));

  return url;
}
