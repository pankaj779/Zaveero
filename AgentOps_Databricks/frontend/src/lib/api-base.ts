/** AgentOps API base URL — dev uses Vite proxy; production uses env or same-origin /api via Vercel rewrite. */

export function normalizeApiBase(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) return `http://${trimmed}`
  return `https://${trimmed}`
}

const PRODUCTION_API_HOSTS: Record<string, string> = {
  'agentops.zaavero.com': 'https://agentops-api.zaavero.com',
}

export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined
  if (fromEnv?.trim()) return normalizeApiBase(fromEnv)

  if (typeof window !== 'undefined') {
    const mapped = PRODUCTION_API_HOSTS[window.location.hostname]
    if (mapped) return mapped
  }
  return ''
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl()
}

export function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = resolveApiBaseUrl()
  if (base) return `${base}${path.startsWith('/') ? path : `/${path}`}`
  return path
}
