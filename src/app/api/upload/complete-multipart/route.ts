import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { files, shares, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getS3Client, getBucket } from "@/lib/s3";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { z } from "zod";

const partSchema = z.object({
  PartNumber: z.number().int().positive(),
  ETag: z.string().min(1),
});

const requestSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  fileId: z.string().uuid(),
  parts: z.array(partSchema).min(1),
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

  const { key, uploadId, fileId, parts } = parsed.data;

  const s3 = getS3Client();
  const bucket = getBucket();

  // Complete the multipart upload in R2
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  });

  try {
    await s3.send(command);
  } catch (error) {
    console.error("Failed to complete multipart upload:", error);
    // Mark file as failed
    await db
      .update(files)
      .set({ uploadStatus: "failed", updatedAt: new Date() })
      .where(eq(files.id, fileId));

    return Response.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }

  // Update file status in database
  await db
    .update(files)
    .set({
      uploadStatus: "complete",
      multipartUploadId: null,
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileId));

  // Create share link
  const shareId = nanoid(8);
  await db.insert(shares).values({
    id: shareId,
    fileId,
  });

  // Update user storage used
  if (session?.user) {
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (file) {
      await db
        .update(users)
        .set({
          storageUsed: file.size, // Will be added via SQL
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.user.id));

      // More accurate: increment storageUsed
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (user) {
        await db
          .update(users)
          .set({
            storageUsed: user.storageUsed + file.size,
            updatedAt: new Date(),
          })
          .where(eq(users.id, session.user.id));
      }
    }
  }

  return Response.json({
    shareId,
    shareUrl: `/s/${shareId}`,
  });
}
