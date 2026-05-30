"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SsoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("zaavero_token");
    if (!token) {
      setError("Missing SSO token. Launch DataWhisper from your Zaavero workspace.");
      return;
    }

    (async () => {
      const result = await signIn("credentials", {
        zaaveroToken: token,
        redirect: false,
      });
      if (result?.error) {
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
            <p className="text-[hsl(var(--muted-foreground))]">Signing you in via Zaavero…</p>
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
