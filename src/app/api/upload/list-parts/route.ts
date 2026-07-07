import { NextRequest } from "next/server";
import { getS3Client, getBucket } from "@/lib/s3";
import { ListPartsCommand } from "@aws-sdk/client-s3";
import { z } from "zod";

const requestSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
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

  const { key, uploadId } = parsed.data;

  const s3 = getS3Client();
  const bucket = getBucket();

  const command = new ListPartsCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
  });

  const result = await s3.send(command);

  const parts = (result.Parts || []).map((part) => ({
    PartNumber: part.PartNumber,
    Size: part.Size,
    ETag: part.ETag,
  }));

  return Response.json({ parts });
}
