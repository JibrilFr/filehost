import { requireAdmin } from "@/lib/auth-utils";
import { getAdminSettings } from "@/actions/admin";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = {
  title: "Settings — Admin — FileHost",
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getAdminSettings();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
