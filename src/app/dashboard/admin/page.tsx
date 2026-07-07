import { requireAdmin } from "@/lib/auth-utils";
import { getAdminStats } from "@/actions/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, FileIcon, HardDrive, Download } from "lucide-react";
import { formatBytes } from "@/lib/format";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Admin — FileHost",
};

export default async function AdminPage() {
  await requireAdmin();
  const stats = await getAdminStats();

  const cards = [
    {
      title: "Total Users",
      value: stats.users.toString(),
      icon: Users,
      href: "/dashboard/admin/users",
    },
    {
      title: "Total Files",
      value: stats.files.toString(),
      icon: FileIcon,
      href: "/dashboard/admin/files",
    },
    {
      title: "Storage Used",
      value: formatBytes(stats.totalSize),
      icon: HardDrive,
    },
    {
      title: "Total Downloads",
      value: stats.totalDownloads.toString(),
      icon: Download,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Panel</h1>
        <Link href="/dashboard/admin/settings">
          <Button variant="secondary" size="sm">
            Settings
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.href && (
                <Link
                  href={card.href}
                  className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  View all →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
