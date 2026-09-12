export function dashboardPath(code?: string | null) {
  const trimmed = code?.trim();
  if (!trimmed) return "/dashboard";
  return `/dashboard?code=${encodeURIComponent(trimmed)}`;
}

export function homePath(code?: string | null) {
  const trimmed = code?.trim();
  if (!trimmed) return "/";
  return `/?code=${encodeURIComponent(trimmed)}`;
}
