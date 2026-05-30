"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { parseApiError } from "@/lib/api-error";
import { getPublicApiUrl } from "@/lib/server-api";

type Mode = "login" | "register" | "join";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "register" || m === "join") setMode(m);
  }, [searchParams]);

  async function handleRegisterOrJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/join";
      const body =
        mode === "register"
          ? { email: email.trim(), password, name: name.trim(), workspace_name: workspaceName.trim() }
          : { email: email.trim(), password, name: name.trim(), workspace_slug: workspaceSlug.trim() };

      const res = await fetch(`${getPublicApiUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(parseApiError(data?.detail, "Registration failed"));
        return;
      }

      const result = await signIn("credentials", {
        platformAccessToken: data.access_token,
        redirect: false,
      });
      if (result?.error) {
        setError("Account created but session setup failed. Try signing in with your password.");
        setMode("login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Is the API running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${getPublicApiUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = parseApiError(data?.detail, "Invalid email or password");
        setError(
          res.status === 401
            ? `${msg} If you registered before a recent platform reset, use "Create a new workspace" below.`
            : msg
        );
        return;
      }

      const result = await signIn("credentials", {
        platformAccessToken: data.access_token,
        redirect: false,
      });
      if (result?.error) {
        setError("Sign-in succeeded but session setup failed. Try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Is the API running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col hero-grid">
      <header className="border-b border-[hsl(var(--border))]/60 px-6 py-4 flex items-center justify-between glass">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-xl border-[hsl(var(--border))]">
          <CardHeader>
            <CardTitle>
              {mode === "login" && "Welcome back"}
              {mode === "register" && "Create your workspace"}
              {mode === "join" && "Join a workspace"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "One identity across your entire constellation"}
              {mode === "register" && "You'll be the workspace admin"}
              {mode === "join" && "Enter your workspace slug to join"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} />
                <PasswordField id="password" label="Password" value={password} onChange={setPassword} />
                {error && <ErrorMsg message={error} />}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterOrJoin} className="space-y-4">
                <Field id="name" label="Full name" value={name} onChange={setName} />
                <Field id="email" label="Email" type="email" value={email} onChange={setEmail} />
                <PasswordField id="password" label="Password (min 8 characters)" value={password} onChange={setPassword} minLength={8} />
                {mode === "register" && (
                  <Field id="workspace" label="Workspace name" value={workspaceName} onChange={setWorkspaceName} />
                )}
                {mode === "join" && (
                  <Field id="slug" label="Workspace slug" value={workspaceSlug} onChange={setWorkspaceSlug} placeholder="acme-corp" />
                )}
                {error && <ErrorMsg message={error} />}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : mode === "register" ? "Create workspace" : "Join workspace"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))] space-y-2">
              {mode !== "login" && (
                <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => { setMode("login"); setError(""); }}>
                  Already have an account? Sign in
                </button>
              )}
              {mode !== "register" && (
                <p>
                  <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => { setMode("register"); setError(""); }}>
                    Create a new workspace
                  </button>
                </p>
              )}
              {mode !== "join" && (
                <p>
                  <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => { setMode("join"); setError(""); }}>
                    Join an existing workspace
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  id, label, value, onChange, type = "text", placeholder, minLength,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; minLength?: number;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required minLength={minLength} className="mt-1" />
    </div>
  );
}

function PasswordField({
  id, label, value, onChange, minLength,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; minLength?: number;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        className="mt-1"
      />
    </div>
  );
}

function ErrorMsg({ message }: { message: string }) {
  return <p className="text-sm text-red-500 rounded-lg bg-red-500/10 px-3 py-2">{message}</p>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
