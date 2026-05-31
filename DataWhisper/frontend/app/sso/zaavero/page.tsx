"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { postAuth, sessionCredentialsFromAuth, wakeBackend } from "@/lib/api-auth";

function SsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Connecting to DataWhisper…");

  useEffect(() => {
    const token = searchParams.get("zaavero_token");
    if (!token) {
      setError("Missing SSO token. Launch DataWhisper from your Zaavero workspace.");
      return;
    }

    (async () => {
      setStatus("Waking API server (first launch may take up to a minute)…");
      await wakeBackend();
      setStatus("Signing you in via Zaavero…");

      const result = await postAuth("/auth/zaavero-sso", { token });
      if (!result.ok) {
        setError(
          result.detail === "Invalid or expired Zaavero token"
            ? "SSO sign-in failed. Try launching again from Zaavero."
            : result.detail
        );
        return;
      }

      const signInResult = await signIn("credentials", {
        ...sessionCredentialsFromAuth(result.data),
        redirect: false,
      });
      if (signInResult?.error) {
        setError("SSO sign-in failed. Try launching again from Zaavero.");
        return;
      }
      router.replace("/dashboard");
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {error ? (
          <>
            <p className="text-red-400 mb-4">{error}</p>
            <a href="/login" className="text-sm text-[hsl(var(--primary))] hover:underline">
              Go to login
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
            <p className="text-[hsl(var(--muted-foreground))]">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ZaaveroSsoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <SsoContent />
    </Suspense>
  );
}
