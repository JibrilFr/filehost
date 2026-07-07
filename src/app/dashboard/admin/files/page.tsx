import { requireAdmin } from "@/lib/auth-utils";
import { getAdminFiles } from "@/actions/admin";
import { FilesTable } from "@/components/admin/files-table";

export const metadata = {
  title: "Files — Admin — FileHost",
};

export default async function AdminFilesPage() {
  await requireAdmin();
  const files = await getAdminFiles();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold">All Files</h1>
      <FilesTable files={files} />
    </div>
  );
}
