"use server";

import { db } from "@/lib/db";
import { files, folders, shares, users } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import { getS3Client, getBucket } from "@/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

// ─── File Actions ───────────────────────────────────────

export async function getUserFiles(folderId: string | null) {
  const session = await requireAuth();

  const condition = folderId
    ? and(eq(files.userId, session.user.id), eq(files.folderId, folderId))
    : and(eq(files.userId, session.user.id), isNull(files.folderId));

  const fileList = await db
    .select({
      id: files.id,
      name: files.name,
      size: files.size,
      mimeType: files.mimeType,
      downloadCount: files.downloadCount,
      createdAt: files.createdAt,
      updatedAt: files.updatedAt,
      expiresAt: files.expiresAt,
      folderId: files.folderId,
      uploadStatus: files.uploadStatus,
    })
    .from(files)
    .where(condition);

  // Get share info for each file
  const filesWithShares = await Promise.all(
    fileList
      .filter((f) => f.uploadStatus === "complete")
      .map(async (file) => {
        const [share] = await db
          .select()
          .from(shares)
          .where(eq(shares.fileId, file.id))
          .limit(1);

        return {
          ...file,
          shareId: share?.id || null,
          shareActive: share?.isActive || false,
        };
      })
  );

  return filesWithShares;
}

export async function getUserFolders(parentId: string | null) {
  const session = await requireAuth();

  const condition = parentId
    ? and(
        eq(folders.userId, session.user.id),
        eq(folders.parentId, parentId)
      )
    : and(
        eq(folders.userId, session.user.id),
        isNull(folders.parentId)
      );

  const folderList = await db.select().from(folders).where(condition);

  // Count children for each folder
  const foldersWithCount = await Promise.all(
    folderList.map(async (folder) => {
      const [childFiles] = await db
        .select({ count: sql<number>`count(*)` })
        .from(files)
        .where(eq(files.folderId, folder.id));

      const [childFolders] = await db
        .select({ count: sql<number>`count(*)` })
        .from(folders)
        .where(eq(folders.parentId, folder.id));

      return {
        ...folder,
        childCount:
          Number(childFiles?.count || 0) + Number(childFolders?.count || 0),
      };
    })
  );

  return foldersWithCount;
}

export async function renameFile(fileId: string, newName: string) {
  const session = await requireAuth();

  await db
    .update(files)
    .set({ name: newName, updatedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, session.user.id)));

  revalidatePath("/dashboard");
}

export async function moveFile(fileId: string, targetFolderId: string | null) {
  const session = await requireAuth();

  // Verify target folder belongs to user (if not null)
  if (targetFolderId) {
    const [folder] = await db
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.id, targetFolderId),
          eq(folders.userId, session.user.id)
        )
      )
      .limit(1);

    if (!folder) return { error: "Folder not found" };
  }

  await db
    .update(files)
    .set({ folderId: targetFolderId, updatedAt: new Date() })
    .where(and(eq(files.id, fileId), eq(files.userId, session.user.id)));

  revalidatePath("/dashboard");
}

export async function deleteFile(fileId: string) {
  const session = await requireAuth();

  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, session.user.id)))
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

  // Delete share links
  await db.delete(shares).where(eq(shares.fileId, fileId));

  // Delete file record
  await db.delete(files).where(eq(files.id, fileId));

  // Update user storage
  await db
    .update(users)
    .set({
      storageUsed: sql`GREATEST(${users.storageUsed} - ${file.size}, 0)`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard");
}

export async function toggleShareLink(fileId: string) {
  const session = await requireAuth();

  // Verify ownership
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, session.user.id)))
    .limit(1);

  if (!file) return { error: "File not found" };

  // Check if share exists
  const [existingShare] = await db
    .select()
    .from(shares)
    .where(eq(shares.fileId, fileId))
    .limit(1);

  if (existingShare) {
    // Toggle active state
    await db
      .update(shares)
      .set({ isActive: !existingShare.isActive })
      .where(eq(shares.id, existingShare.id));

    revalidatePath("/dashboard");
    return { shareId: existingShare.id, isActive: !existingShare.isActive };
  } else {
    // Create new share
    const shareId = nanoid(8);
    await db.insert(shares).values({
      id: shareId,
      fileId,
    });

    revalidatePath("/dashboard");
    return { shareId, isActive: true };
  }
}

// ─── Folder Actions ─────────────────────────────────────

export async function createFolder(
  name: string,
  parentId: string | null
) {
  const session = await requireAuth();

  // Check for duplicate name in same parent
  const condition = parentId
    ? and(
        eq(folders.userId, session.user.id),
        eq(folders.parentId, parentId),
        eq(folders.name, name)
      )
    : and(
        eq(folders.userId, session.user.id),
        isNull(folders.parentId),
        eq(folders.name, name)
      );

  const existing = await db
    .select()
    .from(folders)
    .where(condition)
    .limit(1);

  if (existing.length > 0) {
    return { error: "A folder with this name already exists" };
  }

  await db.insert(folders).values({
    name,
    userId: session.user.id,
    parentId,
    isSystem: false,
  });

  revalidatePath("/dashboard");
}

export async function renameFolder(folderId: string, newName: string) {
  const session = await requireAuth();

  // Don't allow renaming system folders
  const [folder] = await db
    .select()
    .from(folders)
    .where(
      and(eq(folders.id, folderId), eq(folders.userId, session.user.id))
    )
    .limit(1);

  if (!folder) return { error: "Folder not found" };
  if (folder.isSystem) return { error: "Cannot rename system folders" };

  await db
    .update(folders)
    .set({ name: newName, updatedAt: new Date() })
    .where(eq(folders.id, folderId));

  revalidatePath("/dashboard");
}

export async function deleteFolder(folderId: string) {
  const session = await requireAuth();

  const [folder] = await db
    .select()
    .from(folders)
    .where(
      and(eq(folders.id, folderId), eq(folders.userId, session.user.id))
    )
    .limit(1);

  if (!folder) return { error: "Folder not found" };
  if (folder.isSystem) return { error: "Cannot delete system folders" };

  // Recursively delete files in this folder and subfolders
  await deleteFolderRecursive(folderId, session.user.id);

  revalidatePath("/dashboard");
}

async function deleteFolderRecursive(folderId: string, userId: string) {
  // Get all files in this folder
  const folderFiles = await db
    .select()
    .from(files)
    .where(eq(files.folderId, folderId));

  // Delete each file from R2
  const s3 = getS3Client();
  const bucket = getBucket();

  for (const file of folderFiles) {
    try {
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: file.storageKey })
      );
    } catch (error) {
      console.error(`Failed to delete ${file.storageKey} from R2:`, error);
    }
  }

  // Delete shares for these files
  for (const file of folderFiles) {
    await db.delete(shares).where(eq(shares.fileId, file.id));
  }

  // Calculate total size for storage update
  const totalSize = folderFiles.reduce((sum, f) => sum + f.size, 0);

  // Delete files from DB
  await db.delete(files).where(eq(files.folderId, folderId));

  // Recursively delete subfolders
  const subfolders = await db
    .select()
    .from(folders)
    .where(eq(folders.parentId, folderId));

  for (const subfolder of subfolders) {
    await deleteFolderRecursive(subfolder.id, userId);
  }

  // Delete this folder
  await db.delete(folders).where(eq(folders.id, folderId));

  // Update user storage
  if (totalSize > 0) {
    await db
      .update(users)
      .set({
        storageUsed: sql`GREATEST(${users.storageUsed} - ${totalSize}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export async function getFolderBreadcrumbs(folderId: string | null) {
  if (!folderId) return [];

  const breadcrumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, currentId))
      .limit(1);

    if (!folder) break;

    breadcrumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }

  return breadcrumbs;
}
