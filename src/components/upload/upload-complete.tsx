"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { UploadFileInfo } from "@/types";

interface UploadCompleteProps {
  files: UploadFileInfo[];
}

export function UploadComplete({ files }: UploadCompleteProps) {
  const completedFiles = files.filter(
    (f) => f.status === "complete" && f.shareUrl
  );

  if (completedFiles.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Share links
      </p>
      {completedFiles.map((file) => (
        <ShareLinkRow key={file.id} file={file} />
      ))}
    </div>
  );
}

function ShareLinkRow({ file }: { file: UploadFileInfo }) {
  const [copied, setCopied] = useState(false);
  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${file.shareUrl}`
      : file.shareUrl || "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" title={file.name}>
          {file.name}
        </p>
      </div>
      <Input
        readOnly
        value={fullUrl}
        className="h-8 max-w-[280px] bg-muted/50 text-xs"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
      <a
        href={file.shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
