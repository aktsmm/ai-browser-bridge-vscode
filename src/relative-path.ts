export function isSafeRelativePath(inputPath: unknown): inputPath is string {
  if (typeof inputPath !== "string" || !inputPath.trim()) {
    return false;
  }

  const normalized = inputPath.replace(/\\/g, "/").trim();
  if (
    normalized.startsWith("/") ||
    normalized.includes("://") ||
    normalized.includes(":")
  ) {
    return false;
  }

  if (normalized.endsWith("/")) {
    return false;
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return false;
  }

  return !segments.some((segment) => segment === ".." || segment === ".");
}
