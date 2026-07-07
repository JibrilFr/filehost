"use client";

import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";

interface UserMenuProps {
  user: {
    username: string;
    email: string;
    role: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const initials = user.username
    .split(/[\s_-]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none ring-ring focus-visible:ring-2">
        <Avatar className="h-8 w-8 cursor-pointer transition-opacity hover:opacity-80">
          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
          <User className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem onClick={() => router.push("/dashboard/admin")}>
            <Settings className="mr-2 h-4 w-4" />
            Admin Panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
