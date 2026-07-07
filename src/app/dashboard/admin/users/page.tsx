import { requireAdmin } from "@/lib/auth-utils";
import { getAdminUsers } from "@/actions/admin";
import { UsersTable } from "@/components/admin/users-table";

export const metadata = {
  title: "Users — Admin — FileHost",
};

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await getAdminUsers();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-semibold">Users</h1>
      <UsersTable users={users} />
    </div>
  );
}
