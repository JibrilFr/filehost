import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { files, folders, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getS3Client, getBucket } from "@/lib/s3";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSetting } from "@/lib/settings";
import { z } from "zod";
import { randomUUID } from "crypto";

const requestSchema = z.object({
  filename: z.string().min(1).max(500),
  fileSize: z.number().positive(),
  mimeType: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { filename, fileSize, mimeType } = parsed.data;

  // Check file size limits
  const isAnonymous = !session?.user;
  const maxFileSize = await getSetting(
    isAnonymous ? "limits.anonymous.maxFileSize" : "limits.user.maxFileSize"
  );

  if (fileSize > maxFileSize) {
    return Response.json(
      {
        error: `File too large. Maximum size is ${(maxFileSize / 1073741824).toFixed(1)} GB`,
      },
      { status: 413 }
    );
  }

  // Check storage quota for registered users
  if (session?.user) {
    const storageQuota = await getSetting("limits.user.storageQuota");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user && user.storageUsed + fileSize > storageQuota) {
      return Response.json(
        { error: "Storage quota exceeded" },
        { status: 413 }
      );
    }
  }

  // Build storage key
  const uuid = randomUUID().split("-")[0]; // short uuid prefix
  const userId = session?.user?.id || "anon";
  const storageKey = `uploads/${userId}/${uuid}-${filename}`;

  // Calculate file expiry
  const expirySeconds = await getSetting(
    isAnonymous ? "limits.anonymous.fileExpiry" : "limits.user.fileExpiry"
  );
  const expiresAt =
    expirySeconds > 0
      ? new Date(Date.now() + expirySeconds * 1000)
      : null;

  // Determine folder for registered users (Quick uploads)
  let folderId: string | null = null;
  if (session?.user) {
    const [quickUploads] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, session.user.id),
          eq(folders.isSystem, true),
          eq(folders.name, "Quick uploads")
        )
      )
      .limit(1);

    if (quickUploads) {
      folderId = quickUploads.id;
    }
  }

  // Create multipart upload in R2
  const s3 = getS3Client();
  const bucket = getBucket();

  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: mimeType || "application/octet-stream",
    ContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
  });

  const multipartUpload = await s3.send(command);

  if (!multipartUpload.UploadId) {
    return Response.json(
      { error: "Failed to create multipart upload" },
      { status: 500 }
    );
  }

  // Create file entry in database
  const [file] = await db
    .insert(files)
    .values({
      userId: session?.user?.id || null,
      folderId,
      name: filename,
      storageKey,
      size: fileSize,
      mimeType: mimeType || null,
      expiresAt,
      uploadStatus: "uploading",
      multipartUploadId: multipartUpload.UploadId,
    })
    .returning();

  // Get upload settings for client
  const chunkSize = await getSetting("upload.chunkSize");
  const parallelChunks = await getSetting("upload.parallelChunks");

  return Response.json({
    fileId: file.id,
    key: storageKey,
    uploadId: multipartUpload.UploadId,
    chunkSize,
    parallelChunks,
  });
}
