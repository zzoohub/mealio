import { storage } from "@/shared/lib/storage";

const PENDING_DEEP_LINK_KEY = "pending_deep_link";

const ALLOWED_PREFIXES = ["/diary/"] as const;

function isValidRedirect(path: string): boolean {
  return (
    ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix)) &&
    !path.includes("..") &&
    !/^[a-zA-Z]+:\/\//.test(path)
  );
}

export function setPendingDeepLink(path: string): void {
  storage.set(PENDING_DEEP_LINK_KEY, path, { enableBatching: false });
}

export function consumePendingDeepLink(): string | null {
  const path = storage.get<string>(PENDING_DEEP_LINK_KEY);
  if (path) {
    storage.remove(PENDING_DEEP_LINK_KEY);
  }
  if (path && !isValidRedirect(path)) {
    return null;
  }
  return path;
}
