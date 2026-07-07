/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format seconds to human-readable duration.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format speed in bytes/s to human-readable string.
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Format a date relative to now (e.g., "2 hours ago", "in 3 days").
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.abs(diffMs / 1000);
  const isPast = diffMs < 0;

  if (diffSec < 60) return isPast ? "just now" : "in a moment";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return isPast ? `${m}m ago` : `in ${m}m`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return isPast ? `${h}h ago` : `in ${h}h`;
  }
  const d = Math.floor(diffSec / 86400);
  return isPast ? `${d}d ago` : `in ${d}d`;
}

/**
 * Format a date to a locale string.
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
