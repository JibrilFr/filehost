"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected, disabled]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
        // Reset input value so same file can be selected again
        e.target.value = "";
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            "rounded-full p-3 transition-colors",
            isDragging
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground group-hover:text-foreground"
          )}
        >
          {isDragging ? (
            <FileIcon className="h-8 w-8" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop files here" : "Drop files here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload one or multiple files
          </p>
        </div>
      </div>
    </div>
  );
}
