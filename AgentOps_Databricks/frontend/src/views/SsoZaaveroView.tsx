import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api-base";

export function SsoZaaveroView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("zaavero_token");
    if (!token) {
      setError("Missing SSO token");
      return;
    }
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/v1/auth/zaavero-sso"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const detail = typeof data?.detail === "string" ? data.detail : "SSO login failed";
          const hint =
            detail === "Not Found"
              ? " AgentOps API is unreachable — ensure the backend is running on port 8081 and restart the frontend."
              : "";
          setError(detail + hint);
          return;
        }
        setAuth(data.access_token, data.user);
        navigate(data.has_connection ? "/" : "/connect", { replace: true });
      } catch {
        setError("Could not complete SSO login");
      }
    })();
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-500">{error}</p>
            <a href="/login" className="mt-4 inline-block text-sm text-[var(--accent)]">
              Sign in manually
            </a>
          </>
        ) : (
          <p className="text-[var(--muted)]">Signing you in via Zaavero…</p>
        )}
      </div>
    </div>
  );
}
