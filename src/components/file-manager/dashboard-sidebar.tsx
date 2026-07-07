"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  Upload,
  Settings,
  LogOut,
  ChevronUp,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  user: {
    username: string;
    email: string;
    role: string;
  };
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = user.username
    .split(/[\s_-]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navItems = [
    {
      href: "/",
      label: "Upload",
      icon: Upload,
    },
    {
      href: "/dashboard",
      label: "Files",
      icon: FolderOpen,
      exact: false,
    },
  ];

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border/40 bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Home className="h-4 w-4" />
          FileHost
        </Link>
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = item.exact !== false
            ? pathname === item.href
            : pathname.startsWith(item.href) && item.href !== "/";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-50" />

      {/* User profile */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-left text-sidebar-foreground">
              {user.username}
            </span>
            <ChevronUp className="h-4 w-4 text-sidebar-foreground/50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            {user.role === "admin" && (
              <>
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/admin")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
