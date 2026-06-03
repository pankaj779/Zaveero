import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAuth } from "@/lib/auth";
import { apiUrl, resolveApiBaseUrl } from "@/lib/api-base";

function parseApiError(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) return `Request failed (${status})`;
  try {
    const data = JSON.parse(trimmed) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
  } catch {
    if (trimmed.startsWith("<!") || trimmed.includes("<html")) {
      return (
        "AgentOps API was not reached (received the web app page instead of JSON). " +
        "Redeploy the frontend with the latest vercel.json or set VITE_API_URL=https://agentops-api.zaavero.com on Vercel."
      );
    }
  }
  return trimmed.slice(0, 400);
}

export function SsoZaaveroView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("zaavero_token");
    if (!token) {
      setError("Missing SSO token. Launch AgentOps from Zaavero → Products → AgentOps.");
      return;
    }
    (async () => {
      const url = apiUrl("/api/v1/auth/zaavero-sso");
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const text = await res.text();
        let data: { access_token?: string; user?: unknown; has_connection?: boolean } | null = null;
        try {
          data = text ? (JSON.parse(text) as typeof data) : null;
        } catch {
          setError(parseApiError(text, res.status));
          return;
        }
        if (!res.ok) {
          setError(parseApiError(text, res.status));
          return;
        }
        if (!data?.access_token || !data.user) {
          setError("SSO succeeded but the API returned an incomplete session. Try again.");
          return;
        }
        setAuth(data.access_token, data.user as Parameters<typeof setAuth>[1]);
        navigate(data.has_connection ? "/" : "/connect", { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        const base = resolveApiBaseUrl() || "(same-origin /api)";
        setError(
          `Could not complete SSO login (${msg}). API target: ${base}. ` +
            "Use Launch from www.zaavero.com, or sign in manually on AgentOps if you created a password here."
        );
      }
    })();
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <p className="text-red-500 text-sm whitespace-pre-wrap">{error}</p>
            <a
              href="https://www.zaavero.com"
              className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Open Zaavero to launch again
            </a>
            <a href="/login" className="mt-2 block text-sm text-[var(--muted)] hover:underline">
              Sign in manually on AgentOps
            </a>
          </>
        ) : (
          <p className="text-[var(--muted)]">Signing you in via Zaavero…</p>
        )}
      </div>
    </div>
  );
}
