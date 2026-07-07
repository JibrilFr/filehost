import { FileManagerClient } from "@/components/file-manager/file-manager-client";

export const metadata = {
  title: "Dashboard — FileHost",
  description: "Manage your uploaded files",
};

export default function DashboardPage() {
  return <FileManagerClient />;
}
