"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  getUserFiles,
  getUserFolders,
  getFolderBreadcrumbs,
  deleteFile,
  deleteFolder,
  renameFile,
  renameFolder,
  createFolder,
  toggleShareLink,
  moveFile,
} from "@/actions/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  FolderPlus,
  FolderOpen,
  FileIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  Link2,
  Link2Off,
  ChevronRight,
  Home,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string | null;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  folderId: string | null;
  shareId: string | null;
  shareActive: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  childCount: number;
}

export function FileManagerClient() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [foldersList, setFoldersList] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string; name: string }[]
  >([]);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
    type: "file" | "folder";
  } | null>(null);
  const [renameName, setRenameName] = useState("");

  const loadContent = useCallback(
    (folderId: string | null) => {
      startTransition(async () => {
        const [fileList, folderList, crumbs] = await Promise.all([
          getUserFiles(folderId),
          getUserFolders(folderId),
          getFolderBreadcrumbs(folderId),
        ]);
        setFiles(fileList as FileItem[]);
        setFoldersList(folderList as FolderItem[]);
        setBreadcrumbs(crumbs);
      });
    },
    []
  );

  useEffect(() => {
    loadContent(currentFolderId);
  }, [currentFolderId, loadContent]);

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      const result = await createFolder(newFolderName.trim(), currentFolderId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Folder created");
        setNewFolderOpen(false);
        setNewFolderName("");
        loadContent(currentFolderId);
      }
    });
  };

  const handleRename = () => {
    if (!renameTarget || !renameName.trim()) return;
    startTransition(async () => {
      if (renameTarget.type === "file") {
        await renameFile(renameTarget.id, renameName.trim());
      } else {
        const result = await renameFolder(renameTarget.id, renameName.trim());
        if (result?.error) {
          toast.error(result.error);
          return;
        }
      }
      toast.success("Renamed successfully");
      setRenameDialogOpen(false);
      setRenameTarget(null);
      loadContent(currentFolderId);
    });
  };

  const handleDelete = (id: string, type: "file" | "folder", name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      if (type === "file") {
        await deleteFile(id);
      } else {
        const result = await deleteFolder(id);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
      }
      toast.success("Deleted");
      loadContent(currentFolderId);
    });
  };

  const handleToggleShare = (fileId: string) => {
    startTransition(async () => {
      const result = await toggleShareLink(fileId);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.isActive) {
        const url = `${window.location.origin}/s/${result.shareId}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } else {
        toast.success("Share link disabled");
      }
      loadContent(currentFolderId);
    });
  };

  const openRenameDialog = (
    id: string,
    name: string,
    type: "file" | "folder"
  ) => {
    setRenameTarget({ id, name, type });
    setRenameName(name);
    setRenameDialogOpen(true);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyShareLink = async (shareId: string) => {
    const url = `${window.location.origin}/s/${shareId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    toast.success("Link copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => navigateToFolder(null)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <button
                onClick={() => navigateToFolder(crumb.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => {
            setNewFolderName("");
            setNewFolderOpen(true);
          }}
        >
          <FolderPlus className="h-4 w-4" />
          New folder
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {foldersList.length === 0 && files.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <FolderOpen className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">This folder is empty</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Folders */}
            {foldersList.map((folder) => (
              <div
                key={folder.id}
                className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <button
                  onClick={() => navigateToFolder(folder.id)}
                  className="flex flex-1 items-center gap-3"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-left text-sm">
                    {folder.name}
                  </span>
                  {folder.isSystem && (
                    <Badge variant="secondary" className="text-[10px]">
                      System
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {folder.childCount} items
                  </span>
                </button>

                {!folder.isSystem && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          openRenameDialog(folder.id, folder.name, "folder")
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          handleDelete(folder.id, "folder", folder.name)
                        }
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            {foldersList.length > 0 && files.length > 0 && (
              <Separator className="my-2 opacity-50" />
            )}

            {/* Files */}
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{file.name}</span>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {file.shareId && file.shareActive && (
                    <button
                      onClick={() => copyShareLink(file.shareId!)}
                      className="flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {copiedId === file.shareId ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                  <span>{formatBytes(file.size)}</span>
                  <span className="hidden sm:inline">
                    {formatDate(file.createdAt)}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleToggleShare(file.id)}
                    >
                      {file.shareActive ? (
                        <>
                          <Link2Off className="mr-2 h-4 w-4" />
                          Disable link
                        </>
                      ) : (
                        <>
                          <Link2 className="mr-2 h-4 w-4" />
                          Generate link
                        </>
                      )}
                    </DropdownMenuItem>
                    {file.shareId && file.shareActive && (
                      <DropdownMenuItem
                        onClick={() => copyShareLink(file.shareId!)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        openRenameDialog(file.id, file.name, "file")
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() =>
                        handleDelete(file.id, "file", file.name)
                      }
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setNewFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.type}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="New name"
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isPending}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
