"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  FileIcon,
  HardDrive,
  Calendar,
  Clock,
  BarChart3,
  Loader2,
} from "lucide-react";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/format";
import { getDownloadUrl } from "@/actions/shares";
import type { SharePageData } from "@/types";

interface SharePageClientProps {
  data: SharePageData;
}

export function SharePageClient({ data }: SharePageClientProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const url = await getDownloadUrl(data.shareId);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileIcon className="h-7 w-7 text-muted-foreground" />
        </div>
        <CardTitle className="break-all text-lg">{data.fileName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-4 w-4 shrink-0" />
            <span>{formatBytes(data.fileSize)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>
              {data.downloadCount}{" "}
              {data.downloadCount === 1 ? "download" : "downloads"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formatDate(data.uploadedAt)}</span>
          </div>
          {data.expiresAt && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Expires{" "}
                {formatRelativeTime(data.expiresAt)}
              </span>
            </div>
          )}
        </div>

        {data.expiresAt && new Date(data.expiresAt).getTime() - Date.now() < 3600000 && (
          <Badge variant="destructive" className="w-full justify-center">
            Expires soon
          </Badge>
        )}

        <Separator />

        <Button
          onClick={handleDownload}
          className="w-full gap-2"
          size="lg"
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isDownloading ? "Preparing download…" : "Download"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Powered by FileHost
        </p>
      </CardContent>
    </Card>
  );
}
