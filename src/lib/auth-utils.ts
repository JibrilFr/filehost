import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Require authentication. Redirects to /login if not authenticated.
 * Returns the session.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Require admin role. Redirects to / if not admin.
 * Returns the session.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    redirect("/");
  }
  return session;
}

/**
 * Get optional session (no redirect).
 */
export async function getOptionalSession() {
  return await auth();
}
