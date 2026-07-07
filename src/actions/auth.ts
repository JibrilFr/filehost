"use server";

import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, folders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSetting } from "@/lib/settings";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores"
    ),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    return { error: "Invalid email or password" };
  }

  redirect("/");
}

export async function registerAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const registrationMode = await getSetting("registration.mode");
  if (registrationMode === "invite") {
    return { error: "Registration is currently invite-only" };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check if email already exists
  const existingEmail = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (existingEmail.length > 0) {
    return { error: "Email is already registered" };
  }

  // Check if username already exists
  const existingUsername = await db
    .select()
    .from(users)
    .where(eq(users.username, parsed.data.username))
    .limit(1);

  if (existingUsername.length > 0) {
    return { error: "Username is already taken" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      username: parsed.data.username,
      passwordHash,
      role: "user",
    })
    .returning();

  // Create the "Quick uploads" system folder
  await db.insert(folders).values({
    name: "Quick uploads",
    userId: newUser.id,
    parentId: null,
    isSystem: true,
  });

  // Sign in the new user
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    // Sign-in after registration failed, redirect to login
    redirect("/login");
  }

  redirect("/");
}

export async function setupAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  // Check that no admin exists yet
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);

  if (existingAdmin.length > 0) {
    return { error: "An admin account already exists" };
  }

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const [newUser] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      username: parsed.data.username,
      passwordHash,
      role: "admin",
    })
    .returning();

  // Create the "Quick uploads" system folder for admin
  await db.insert(folders).values({
    name: "Quick uploads",
    userId: newUser.id,
    parentId: null,
    isSystem: true,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    redirect("/login");
  }

  redirect("/");
}
