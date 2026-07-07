export interface UploadFileInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  progress: number;
  speed: number; // bytes per second
  timeRemaining: number; // seconds
  status: "queued" | "uploading" | "complete" | "error";
  shareUrl?: string;
  error?: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  shareId: string | null;
  shareActive: boolean;
  folderId: string | null;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  isSystem: boolean;
  createdAt: Date;
  childCount: number;
}

export interface AdminSettings {
  "limits.anonymous.maxFileSize": number;
  "limits.anonymous.fileExpiry": number;
  "limits.user.maxFileSize": number;
  "limits.user.storageQuota": number;
  "limits.user.fileExpiry": number;
  "upload.chunkSize": number;
  "upload.parallelChunks": number;
  "registration.mode": "open" | "invite";
  "storage.r2.endpoint": string;
  "storage.r2.bucket": string;
  "storage.r2.accessKey": string;
  "storage.r2.secretKey": string;
  "storage.r2.customDomain": string;
  "storage.r2.deleteBehavior": "single" | "batch";
  "site.name": string;
}

export type SettingKey = keyof AdminSettings;

export interface SharePageData {
  shareId: string;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  uploadedAt: Date;
  expiresAt: Date | null;
}
