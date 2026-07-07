"use client";

import { useUpload } from "@/hooks/use-upload";
import { UploadZone } from "@/components/upload/upload-zone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { UploadComplete } from "@/components/upload/upload-complete";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function UploadClient() {
  const {
    files,
    isUploading,
    addFiles,
    startUpload,
    removeFile,
    clearCompleted,
    reset,
  } = useUpload();

  const hasFiles = files.length > 0;
  const hasQueued = files.some((f) => f.status === "queued");
  const hasCompleted = files.some(
    (f) => f.status === "complete" || f.status === "error"
  );
  const allDone = hasFiles && files.every(
    (f) => f.status === "complete" || f.status === "error"
  );

  return (
    <div className="space-y-4">
      <UploadZone onFilesSelected={addFiles} disabled={isUploading} />

      <UploadProgress files={files} onRemove={removeFile} />

      <UploadComplete files={files} />

      {hasFiles && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {hasCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompleted}
                disabled={isUploading}
              >
                Clear completed
              </Button>
            )}
            {allDone && (
              <Button variant="ghost" size="sm" onClick={reset}>
                New upload
              </Button>
            )}
          </div>

          {hasQueued && (
            <Button
              onClick={startUpload}
              disabled={isUploading}
              size="sm"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading…" : "Upload"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
