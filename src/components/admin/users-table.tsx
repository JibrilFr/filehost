"use client";

import { useTransition } from "react";
import { deleteAdminUser, changeUserRole } from "@/actions/admin";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Shield, ShieldOff } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  storageUsed: number;
  createdAt: Date;
  fileCount: number;
}

export function UsersTable({ users }: { users: UserItem[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? All their files will be deleted.`))
      return;

    startTransition(async () => {
      const result = await deleteAdminUser(userId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted");
        router.refresh();
      }
    });
  };

  const handleRoleChange = (
    userId: string,
    newRole: "user" | "admin"
  ) => {
    startTransition(async () => {
      const result = await changeUserRole(userId, newRole);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Role updated");
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-md border border-border/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Files</TableHead>
            <TableHead>Storage</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell className="text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "admin" ? "default" : "secondary"}
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>{user.fileCount}</TableCell>
              <TableCell>{formatBytes(user.storageUsed)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-colors hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.role === "user" ? (
                      <DropdownMenuItem
                        onClick={() => handleRoleChange(user.id, "admin")}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Make admin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleRoleChange(user.id, "user")}
                      >
                        <ShieldOff className="mr-2 h-4 w-4" />
                        Remove admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(user.id, user.username)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
