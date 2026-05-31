/** Ensure API base URLs always include a protocol (Vercel env sometimes omits https://). */
export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) return `http://${trimmed}`;
  return `https://${trimmed}`;
}
