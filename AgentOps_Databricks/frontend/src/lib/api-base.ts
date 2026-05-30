/** Base URL for AgentOps API in production (Vercel). Empty in dev — Vite proxy handles /api. */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  return raw?.replace(/\/$/, '') ?? ''
}

export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = getApiBaseUrl()
  if (!base) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
