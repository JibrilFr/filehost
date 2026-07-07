import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Setup — FileHost",
  description: "Create the first admin account",
};

export default async function SetupPage() {
  // If an admin already exists, redirect to home
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (existingAdmin.length > 0) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <SetupForm />
    </div>
  );
}
