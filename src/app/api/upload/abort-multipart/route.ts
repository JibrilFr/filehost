import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getS3Client, getBucket } from "@/lib/s3";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { z } from "zod";

const requestSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  fileId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { key, uploadId, fileId } = parsed.data;

  const s3 = getS3Client();
  const bucket = getBucket();

  // Abort the multipart upload in R2
  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });
    await s3.send(command);
  } catch (error) {
    console.error("Failed to abort multipart upload:", error);
  }

  // Mark file as failed in database
  await db
    .update(files)
    .set({ uploadStatus: "failed", updatedAt: new Date() })
    .where(eq(files.id, fileId));

  return Response.json({ success: true });
}
