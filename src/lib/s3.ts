import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;
let cachedConfig: string | null = null;

/**
 * Returns an S3Client configured for Cloudflare R2.
 * Uses environment variables as defaults, can be overridden with parameters
 * (for when settings are stored in the database).
 */
export function getS3Client(config?: {
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}) {
  const endpoint = config?.endpoint || process.env.R2_ENDPOINT!;
  const accessKeyId = config?.accessKeyId || process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey =
    config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY!;
  const region = config?.region || "auto";

  // Cache the client if config hasn't changed
  const configKey = `${endpoint}:${accessKeyId}:${region}`;
  if (cachedClient && cachedConfig === configKey) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  cachedConfig = configKey;
  return cachedClient;
}

/**
 * Get the R2 bucket name from environment or config.
 */
export function getBucket(bucket?: string): string {
  return bucket || process.env.R2_BUCKET || "filehost";
}
