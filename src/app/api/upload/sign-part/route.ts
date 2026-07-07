import { NextRequest } from "next/server";
import { getS3Client, getBucket } from "@/lib/s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const requestSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  partNumber: z.number().int().positive(),
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

  const { key, uploadId, partNumber } = parsed.data;

  const s3 = getS3Client();
  const bucket = getBucket();

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  // Presigned URL valid for 1 hour
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  return Response.json({ url });
}
