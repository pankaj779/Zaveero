/** Browser-side calls to the DataWhisper FastAPI backend (uses NEXT_PUBLIC_API_URL + CORS). */

import { normalizeApiBase } from "@/lib/api-url";

export function getPublicApiBase(): string {
  return normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
}

export type AuthTokenResponse = {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    workspace_id?: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
};

const WAKE_TIMEOUT_MS = 120_000;

export async function wakeBackend(): Promise<void> {
  const base = getPublicApiBase();
  try {
    await fetch(`${base}/health`, { signal: AbortSignal.timeout(WAKE_TIMEOUT_MS) });
  } catch {
    /* health probe is best-effort */
  }
}

export async function postAuth<T = AuthTokenResponse>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; status: number; detail: string }> {
  const url = `${getPublicApiBase()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(WAKE_TIMEOUT_MS),
    });
  } catch {
    return {
      ok: false,
      status: 502,
      detail:
        "Cannot reach the DataWhisper API. The server may be waking up (free tier) — wait a minute and try again.",
    };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : "Request failed";
    return { ok: false, status: res.status, detail };
  }
  return { ok: true, data: data as T };
}

export function sessionCredentialsFromAuth(data: AuthTokenResponse) {
  return {
    accessToken: data.access_token,
    userId: data.user.id,
    email: data.user.email,
    role: data.user.role,
    workspaceId: data.workspace.id,
    workspaceSlug: data.workspace.slug,
    workspaceName: data.workspace.name,
  };
}
