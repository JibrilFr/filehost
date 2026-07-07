"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatBytes, formatSpeed, formatDuration } from "@/lib/format";
import type { UploadFileInfo } from "@/types";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  files: UploadFileInfo[];
  onRemove: (fileId: string) => void;
}

export function UploadProgress({ files, onRemove }: UploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <UploadFileItem key={file.id} file={file} onRemove={onRemove} />
      ))}
    </div>
  );
}

function UploadFileItem({
  file,
  onRemove,
}: {
  file: UploadFileInfo;
  onRemove: (fileId: string) => void;
}) {
  return (
    <div className="group rounded-lg border border-border/50 bg-card p-3 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon status={file.status} />
            <p className="truncate text-sm font-medium" title={file.name}>
              {file.name}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatBytes(file.size)}</span>

            {file.status === "uploading" && (
              <>
                <span className="text-foreground/70">
                  {formatSpeed(file.speed)}
                </span>
                {file.timeRemaining >= 0 && (
                  <span>{formatDuration(file.timeRemaining)} left</span>
                )}
              </>
            )}

            {file.status === "complete" && file.shareUrl && (
              <span className="text-emerald-400">Ready to share</span>
            )}

            {file.status === "error" && (
              <span className="text-destructive">{file.error}</span>
            )}
          </div>
        </div>

        {(file.status === "queued" || file.status === "error") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onRemove(file.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(file.status === "uploading" || file.status === "queued") && (
        <Progress
          value={file.progress}
          className="mt-2 h-1"
        />
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadFileInfo["status"] }) {
  switch (status) {
    case "queued":
      return (
        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
      );
    case "uploading":
      return (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      );
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
}
