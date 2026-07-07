"use server";

import { db } from "@/lib/db";
import { users, files, shares, settings } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-utils";
import { getAllSettings, updateSettings } from "@/lib/settings";
import { getS3Client, getBucket } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import type { AdminSettings } from "@/types";

// ─── Settings ───────────────────────────────────────────

export async function getAdminSettings(): Promise<AdminSettings> {
  await requireAdmin();
  return getAllSettings();
}

export async function saveAdminSettings(data: Partial<AdminSettings>) {
  await requireAdmin();
  await updateSettings(data);
  revalidatePath("/dashboard/admin");
}

// ─── Users ──────────────────────────────────────────────

export async function getAdminUsers() {
  await requireAdmin();

  const userList = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      storageUsed: users.storageUsed,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Get file counts for each user
  const usersWithFiles = await Promise.all(
    userList.map(async (user) => {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(eq(files.userId, user.id));

      return {
        ...user,
        fileCount: Number(result?.count || 0),
      };
    })
  );

  return usersWithFiles;
}

export async function deleteAdminUser(userId: string) {
  const session = await requireAdmin();

  // Don't allow deleting yourself
  if (userId === session.user.id) {
    return { error: "Cannot delete your own account" };
  }

  // Get user's files for R2 cleanup
  const userFiles = await db
    .select()
    .from(files)
    .where(eq(files.userId, userId));

  // Delete files from R2
  const s3 = getS3Client();
  const bucket = getBucket();

  for (const file of userFiles) {
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: file.storageKey })
      );
    } catch (error) {
      console.error(`Failed to delete ${file.storageKey}:`, error);
    }
  }

  // Delete user (cascades to sessions, folders; files/shares cleaned by cascade/set null)
  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/dashboard/admin/users");
}

export async function changeUserRole(
  userId: string,
  role: "user" | "admin"
) {
  const session = await requireAdmin();

  if (userId === session.user.id) {
    return { error: "Cannot change your own role" };
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/dashboard/admin/users");
}

// ─── Files (Admin View) ─────────────────────────────────

export async function getAdminFiles() {
  await requireAdmin();

  const fileList = await db
    .select({
      id: files.id,
      name: files.name,
      size: files.size,
      downloadCount: files.downloadCount,
      uploadStatus: files.uploadStatus,
      createdAt: files.createdAt,
      userId: files.userId,
    })
    .from(files)
    .orderBy(desc(files.createdAt))
    .limit(100);

  // Get username for each file
  const filesWithUser = await Promise.all(
    fileList.map(async (file) => {
      let username = "Anonymous";
      if (file.userId) {
        const [user] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, file.userId))
          .limit(1);
        if (user) username = user.username;
      }
      return { ...file, username };
    })
  );

  return filesWithUser;
}

export async function deleteAdminFile(fileId: string) {
  await requireAdmin();

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file) return { error: "File not found" };

  // Delete from R2
  try {
    const s3 = getS3Client();
    const bucket = getBucket();
    await s3.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: file.storageKey })
    );
  } catch (error) {
    console.error("Failed to delete from R2:", error);
  }

  // Delete shares
  await db.delete(shares).where(eq(shares.fileId, fileId));

  // Update user storage if file has owner
  if (file.userId) {
    await db
      .update(users)
      .set({
        storageUsed: sql`GREATEST(${users.storageUsed} - ${file.size}, 0)`,
      })
      .where(eq(users.id, file.userId));
  }

  // Delete file
  await db.delete(files).where(eq(files.id, fileId));

  revalidatePath("/dashboard/admin/files");
}

// ─── Stats ──────────────────────────────────────────────

export async function getAdminStats() {
  await requireAdmin();

  const [userCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);

  const [fileCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(files);

  const [totalSize] = await db
    .select({ total: sql<number>`coalesce(sum(${files.size}), 0)` })
    .from(files);

  const [totalDownloads] = await db
    .select({
      total: sql<number>`coalesce(sum(${files.downloadCount}), 0)`,
    })
    .from(files);

  return {
    users: Number(userCount?.count || 0),
    files: Number(fileCount?.count || 0),
    totalSize: Number(totalSize?.total || 0),
    totalDownloads: Number(totalDownloads?.total || 0),
  };
}
