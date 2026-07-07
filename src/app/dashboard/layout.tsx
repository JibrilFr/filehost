import { requireAuth } from "@/lib/auth-utils";
import { DashboardSidebar } from "@/components/file-manager/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
