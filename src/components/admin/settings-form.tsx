"use client";

import { useState, useTransition } from "react";
import { saveAdminSettings } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { AdminSettings } from "@/types";

interface SettingsFormProps {
  initialSettings: AdminSettings;
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof AdminSettings>(
    key: K,
    value: AdminSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveAdminSettings(settings);
      toast.success("Settings saved");
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Site */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Site name</Label>
            <Input
              value={settings["site.name"]}
              onChange={(e) => update("site.name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Registration mode</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={settings["registration.mode"]}
              onChange={(e) =>
                update("registration.mode", e.target.value as "open" | "invite")
              }
            >
              <option value="open">Open</option>
              <option value="invite">Invite only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Anonymous limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anonymous limits</CardTitle>
          <CardDescription>
            Limits for users who are not signed in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Max file size (bytes)</Label>
            <Input
              type="number"
              value={settings["limits.anonymous.maxFileSize"]}
              onChange={(e) =>
                update("limits.anonymous.maxFileSize", Number(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">
              Current:{" "}
              {(settings["limits.anonymous.maxFileSize"] / 1073741824).toFixed(1)}{" "}
              GB
            </p>
          </div>
          <div className="space-y-2">
            <Label>File expiry (seconds, 0 = no expiry)</Label>
            <Input
              type="number"
              value={settings["limits.anonymous.fileExpiry"]}
              onChange={(e) =>
                update("limits.anonymous.fileExpiry", Number(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">
              Current:{" "}
              {settings["limits.anonymous.fileExpiry"] > 0
                ? `${(settings["limits.anonymous.fileExpiry"] / 3600).toFixed(1)} hours`
                : "No expiry"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Registered user limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered user limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Max file size (bytes)</Label>
            <Input
              type="number"
              value={settings["limits.user.maxFileSize"]}
              onChange={(e) =>
                update("limits.user.maxFileSize", Number(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">
              Current:{" "}
              {(settings["limits.user.maxFileSize"] / 1073741824).toFixed(1)} GB
            </p>
          </div>
          <div className="space-y-2">
            <Label>Storage quota (bytes)</Label>
            <Input
              type="number"
              value={settings["limits.user.storageQuota"]}
              onChange={(e) =>
                update("limits.user.storageQuota", Number(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">
              Current:{" "}
              {(settings["limits.user.storageQuota"] / 1073741824).toFixed(1)}{" "}
              GB
            </p>
          </div>
          <div className="space-y-2">
            <Label>File expiry (seconds, 0 = no expiry)</Label>
            <Input
              type="number"
              value={settings["limits.user.fileExpiry"]}
              onChange={(e) =>
                update("limits.user.fileExpiry", Number(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chunk size (bytes)</Label>
            <Input
              type="number"
              value={settings["upload.chunkSize"]}
              onChange={(e) =>
                update("upload.chunkSize", Number(e.target.value))
              }
            />
            <p className="text-xs text-muted-foreground">
              Current:{" "}
              {(settings["upload.chunkSize"] / 1048576).toFixed(0)} MB
            </p>
          </div>
          <div className="space-y-2">
            <Label>Parallel chunks</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={settings["upload.parallelChunks"]}
              onChange={(e) =>
                update("upload.parallelChunks", Number(e.target.value))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">R2 Storage</CardTitle>
          <CardDescription>
            Cloudflare R2 credentials and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <Input
              value={settings["storage.r2.endpoint"]}
              onChange={(e) => update("storage.r2.endpoint", e.target.value)}
              placeholder="https://ACCOUNT_ID.r2.cloudflarestorage.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Bucket name</Label>
            <Input
              value={settings["storage.r2.bucket"]}
              onChange={(e) => update("storage.r2.bucket", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Access Key ID</Label>
            <Input
              value={settings["storage.r2.accessKey"]}
              onChange={(e) => update("storage.r2.accessKey", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Secret Access Key</Label>
            <Input
              type="password"
              value={settings["storage.r2.secretKey"]}
              onChange={(e) => update("storage.r2.secretKey", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Custom domain (CDN)</Label>
            <Input
              value={settings["storage.r2.customDomain"]}
              onChange={(e) =>
                update("storage.r2.customDomain", e.target.value)
              }
              placeholder="https://cdn.yourdomain.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Delete behavior</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={settings["storage.r2.deleteBehavior"]}
              onChange={(e) =>
                update(
                  "storage.r2.deleteBehavior",
                  e.target.value as "single" | "batch"
                )
              }
            >
              <option value="single">Single (one by one)</option>
              <option value="batch">Batch (DeleteObjects)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
