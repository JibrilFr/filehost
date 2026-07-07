"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import type { UploadFileInfo } from "@/types";

interface UseUploadOptions {
  onComplete?: (fileId: string, shareUrl: string) => void;
}

export function useUpload(options?: UseUploadOptions) {
  const [files, setFiles] = useState<Map<string, UploadFileInfo>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const uppyRef = useRef<Uppy | null>(null);
  const startTimesRef = useRef<Map<string, number>>(new Map());
  const uploadedBytesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const uppy = new Uppy({
      autoProceed: false,
      restrictions: {
        maxFileSize: null, // Handled server-side
      },
    });

    uppy.use(AwsS3, {
      shouldUseMultipart: true,

      async createMultipartUpload(file) {
        const res = await fetch("/api/upload/create-multipart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create upload");
        }

        const data = await res.json();

        // Store fileId in file meta for later use
        uppy.setFileMeta(file.id, {
          fileId: data.fileId,
          storageKey: data.key,
        });

        return {
          uploadId: data.uploadId,
          key: data.key,
        };
      },

      async listParts(_file, { key, uploadId, signal }) {
        const res = await fetch("/api/upload/list-parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, uploadId }),
          signal,
        });

        if (!res.ok) {
          throw new Error("Failed to list parts");
        }

        const data = await res.json();
        return data.parts;
      },

      async signPart(_file, { key, uploadId, partNumber }) {
        const res = await fetch("/api/upload/sign-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, uploadId, partNumber }),
        });

        if (!res.ok) {
          throw new Error("Failed to sign part");
        }

        const data = await res.json();
        return { method: "PUT" as const, url: data.url };
      },

      async completeMultipartUpload(file, { key, uploadId, parts }) {
        const fileId = (file as any).meta?.fileId;

        const res = await fetch("/api/upload/complete-multipart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, uploadId, fileId, parts }),
        });

        if (!res.ok) {
          throw new Error("Failed to complete upload");
        }

        const data = await res.json();
        return { location: data.shareUrl };
      },

      async abortMultipartUpload(file, { key, uploadId }) {
        const fileId = (file as any).meta?.fileId;

        await fetch("/api/upload/abort-multipart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, uploadId, fileId }),
        });
      },
    });

    // Track progress
    uppy.on("upload-progress", (file, progress) => {
      if (!file) return;
      const now = Date.now();
      const startTime = startTimesRef.current.get(file.id) || now;
      const bytesUploaded = progress.bytesUploaded || 0;
      const bytesTotal = progress.bytesTotal || file.size || 0;

      const elapsedSec = (now - startTime) / 1000;
      const speed = elapsedSec > 0 ? bytesUploaded / elapsedSec : 0;
      const remaining =
        speed > 0 ? (bytesTotal - bytesUploaded) / speed : -1;
      const percent =
        bytesTotal > 0 ? (bytesUploaded / bytesTotal) * 100 : 0;

      uploadedBytesRef.current.set(file.id, bytesUploaded);

      setFiles((prev) => {
        const next = new Map(prev);
        const existing = next.get(file.id);
        if (existing) {
          next.set(file.id, {
            ...existing,
            progress: percent,
            speed,
            timeRemaining: remaining,
            status: "uploading",
          });
        }
        return next;
      });
    });

    uppy.on("upload-success", (file, response) => {
      if (!file) return;
      const shareUrl = response?.uploadURL || "";
      const fileId = (file as any).meta?.fileId;

      setFiles((prev) => {
        const next = new Map(prev);
        const existing = next.get(file.id);
        if (existing) {
          next.set(file.id, {
            ...existing,
            progress: 100,
            speed: 0,
            timeRemaining: 0,
            status: "complete",
            shareUrl,
          });
        }
        return next;
      });

      options?.onComplete?.(fileId, shareUrl);
    });

    uppy.on("upload-error", (file, error) => {
      if (!file) return;
      setFiles((prev) => {
        const next = new Map(prev);
        const existing = next.get(file.id);
        if (existing) {
          next.set(file.id, {
            ...existing,
            status: "error",
            error: error?.message || "Upload failed",
          });
        }
        return next;
      });
    });

    uppy.on("complete", () => {
      setIsUploading(false);
    });

    uppyRef.current = uppy;

    return () => {
      uppy.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const uppy = uppyRef.current;
    if (!uppy) return;

    const fileArray = Array.from(fileList);

    for (const file of fileArray) {
      try {
        const id = uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          source: "local",
        });

        startTimesRef.current.set(id, Date.now());
        uploadedBytesRef.current.set(id, 0);

        setFiles((prev) => {
          const next = new Map(prev);
          next.set(id, {
            id,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            progress: 0,
            speed: 0,
            timeRemaining: -1,
            status: "queued",
          });
          return next;
        });
      } catch (err) {
        console.error("Failed to add file:", err);
      }
    }
  }, []);

  const startUpload = useCallback(async () => {
    const uppy = uppyRef.current;
    if (!uppy) return;

    setIsUploading(true);

    // Reset start times
    for (const [id] of startTimesRef.current) {
      startTimesRef.current.set(id, Date.now());
    }

    try {
      await uppy.upload();
    } catch (err) {
      console.error("Upload error:", err);
      setIsUploading(false);
    }
  }, []);

  const removeFile = useCallback((fileId: string) => {
    const uppy = uppyRef.current;
    if (!uppy) return;

    try {
      uppy.removeFile(fileId);
    } catch {
      // File might not exist in Uppy anymore
    }

    setFiles((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });

    startTimesRef.current.delete(fileId);
    uploadedBytesRef.current.delete(fileId);
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => {
      const next = new Map(prev);
      for (const [id, file] of next) {
        if (file.status === "complete" || file.status === "error") {
          next.delete(id);
          try {
            uppyRef.current?.removeFile(id);
          } catch {
            // ignore
          }
        }
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const uppy = uppyRef.current;
    if (!uppy) return;

    uppy.cancelAll();
    setFiles(new Map());
    setIsUploading(false);
    startTimesRef.current.clear();
    uploadedBytesRef.current.clear();
  }, []);

  return {
    files: Array.from(files.values()),
    isUploading,
    addFiles,
    startUpload,
    removeFile,
    clearCompleted,
    reset,
  };
}
