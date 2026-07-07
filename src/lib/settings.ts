import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { AdminSettings, SettingKey } from "@/types";

const DEFAULT_SETTINGS: Record<string, unknown> = {
  "limits.anonymous.maxFileSize": 2147483648, // 2GB
  "limits.anonymous.fileExpiry": 86400, // 24h in seconds
  "limits.user.maxFileSize": 10737418240, // 10GB
  "limits.user.storageQuota": 53687091200, // 50GB
  "limits.user.fileExpiry": 0, // no expiry
  "upload.chunkSize": 10485760, // 10MB
  "upload.parallelChunks": 5,
  "registration.mode": "open",
  "storage.r2.endpoint": process.env.R2_ENDPOINT || "",
  "storage.r2.bucket": process.env.R2_BUCKET || "filehost",
  "storage.r2.accessKey": process.env.R2_ACCESS_KEY_ID || "",
  "storage.r2.secretKey": process.env.R2_SECRET_ACCESS_KEY || "",
  "storage.r2.customDomain": process.env.R2_CUSTOM_DOMAIN || "",
  "storage.r2.deleteBehavior": "single",
  "site.name": "FileHost",
};

/**
 * Seed default settings into the database if they don't exist.
 */
export async function seedDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(settings).values({
        key,
        value: { value },
      });
    }
  }
}

/**
 * Get a single setting value.
 */
export async function getSetting<K extends SettingKey>(
  key: K
): Promise<AdminSettings[K]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (!row) {
    const defaultValue = DEFAULT_SETTINGS[key];
    return defaultValue as AdminSettings[K];
  }

  return (row.value as { value: AdminSettings[K] }).value;
}

/**
 * Get multiple settings at once.
 */
export async function getSettings<K extends SettingKey>(
  keys: K[]
): Promise<Pick<AdminSettings, K>> {
  const rows = await db.select().from(settings);
  const result = {} as Record<string, unknown>;

  for (const key of keys) {
    const row = rows.find((r) => r.key === key);
    if (row) {
      result[key] = (row.value as { value: unknown }).value;
    } else {
      result[key] = DEFAULT_SETTINGS[key];
    }
  }

  return result as Pick<AdminSettings, K>;
}

/**
 * Get all settings.
 */
export async function getAllSettings(): Promise<AdminSettings> {
  const rows = await db.select().from(settings);
  const result = { ...DEFAULT_SETTINGS } as Record<string, unknown>;

  for (const row of rows) {
    result[row.key] = (row.value as { value: unknown }).value;
  }

  return result as unknown as AdminSettings;
}

/**
 * Update a setting value.
 */
export async function updateSetting<K extends SettingKey>(
  key: K,
  value: AdminSettings[K]
) {
  const existing = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(settings).values({
      key,
      value: { value },
    });
  } else {
    await db
      .update(settings)
      .set({ value: { value }, updatedAt: new Date() })
      .where(eq(settings.key, key));
  }
}

/**
 * Update multiple settings at once.
 */
export async function updateSettings(
  updates: Partial<AdminSettings>
) {
  for (const [key, value] of Object.entries(updates)) {
    await updateSetting(key as SettingKey, value as any);
  }
}
