/**
 * Base URL for the FastAPI backend when called from Next.js **server** code
 * (Route Handlers, Server Components, next-auth authorize).
 *
 * INTERNAL_API_URL must point at the backend container (e.g. http://backend:8000).
 * NEXT_PUBLIC_API_URL is for the browser only (http://localhost:8000); using it
 * inside the frontend container would call the wrong host and break auth/register.
 */
export function getBackendUrl(): string {
  const raw =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  return raw.replace(/\/$/, "");
}
