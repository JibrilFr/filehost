import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  bigint,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const uploadStatusEnum = pgEnum("upload_status", [
  "pending",
  "uploading",
  "complete",
  "failed",
]);

// ─── Users ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  storageUsed: bigint("storage_used", { mode: "number" }).default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Sessions (Auth.js) ─────────────────────────────────

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// ─── Accounts (Auth.js — required by adapter) ───────────

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
});

// ─── Folders ────────────────────────────────────────────

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): any => folders.id, {
      onDelete: "cascade",
    }),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("folders_user_parent_name_idx").on(
      table.userId,
      table.parentId,
      table.name
    ),
  ]
);

// ─── Files ──────────────────────────────────────────────

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  folderId: uuid("folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 500 }).notNull(),
  storageKey: varchar("storage_key", { length: 1000 }).notNull().unique(),
  size: bigint("size", { mode: "number" }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }),
  downloadCount: integer("download_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  uploadStatus: uploadStatusEnum("upload_status").default("pending").notNull(),
  multipartUploadId: varchar("multipart_upload_id", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Shares ─────────────────────────────────────────────

export const shares = pgTable("shares", {
  id: varchar("id", { length: 20 }).primaryKey(),
  fileId: uuid("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
});

// ─── Settings ───────────────────────────────────────────

export const settings = pgTable("settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Type exports ───────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;
export type Setting = typeof settings.$inferSelect;
