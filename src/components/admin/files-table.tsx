"use client";

import { useTransition } from "react";
import { deleteAdminFile } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FileItem {
  id: string;
  name: string;
  size: number;
  downloadCount: number;
  uploadStatus: string;
  createdAt: Date;
  userId: string | null;
  username: string;
}

export function FilesTable({ files }: { files: FileItem[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (fileId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    startTransition(async () => {
      const result = await deleteAdminFile(fileId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("File deleted");
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-md border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Downloads</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="max-w-[200px] truncate font-medium">
                {file.name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {file.username}
              </TableCell>
              <TableCell>{formatBytes(file.size)}</TableCell>
              <TableCell>{file.downloadCount}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    file.uploadStatus === "complete"
                      ? "default"
                      : file.uploadStatus === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {file.uploadStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(file.createdAt)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(file.id, file.name)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
