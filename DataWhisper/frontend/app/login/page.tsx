"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggleButton } from "@/components/theme-toggle";
import {
  getPublicApiBase,
  postAuth,
  sessionCredentialsFromAuth,
  wakeBackend,
} from "@/lib/api-auth";

const apiBase = getPublicApiBase();

type Mode = "login" | "register" | "join";

type Lookup = {
  name: string;
  slug: string;
  allow_self_serve_join: boolean;
  default_join_role: string;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My workspace");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupErr, setLookupErr] = useState<string | null>(null);

  useEffect(() => {
    const m = searchParams.get("mode");
    const slug = searchParams.get("slug");
    if (m === "join" && slug) {
      setMode("join");
      setWorkspaceSlug(slug);
    }
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "join" || !workspaceSlug.trim()) {
      setLookup(null);
      setLookupErr(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBase}/workspace/lookup?slug=${encodeURIComponent(workspaceSlug.trim().toLowerCase())}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLookup(null);
          setLookupErr(typeof data.detail === "string" ? data.detail : "Workspace not found");
          return;
        }
        setLookup(data as Lookup);
        setLookupErr(null);
      } catch {
        setLookupErr("Could not verify workspace");
        setLookup(null);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [mode, workspaceSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await wakeBackend();

      if (mode === "register") {
        const result = await postAuth("/auth/register", {
          email,
          password,
          workspace_name: workspaceName,
        });
        if (!result.ok) {
          setError(result.detail);
          setLoading(false);
          return;
        }
        const r = await signIn("credentials", {
          ...sessionCredentialsFromAuth(result.data),
          redirect: false,
        });
        if (r?.error) {
          setError("Registered but session failed. Try signing in.");
          setLoading(false);
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (mode === "join") {
        if (lookup && !lookup.allow_self_serve_join) {
          setError("This workspace only accepts invited accounts. Your admin must create your login under Team & access.");
          setLoading(false);
          return;
        }
        const result = await postAuth("/auth/join", {
          email,
          password,
          workspace_slug: workspaceSlug.trim().toLowerCase(),
        });
        if (!result.ok) {
          setError(result.detail);
          setLoading(false);
          return;
        }
        const r = await signIn("credentials", {
          ...sessionCredentialsFromAuth(result.data),
          redirect: false,
        });
        if (r?.error) {
          setError("Joined but session failed. Try signing in.");
          setLoading(false);
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const result = await postAuth("/auth/login", { email, password });
      if (!result.ok) {
        setError(result.detail === "Invalid credentials" ? "Invalid email or password" : result.detail);
        setLoading(false);
        return;
      }
      const r = await signIn("credentials", {
        ...sessionCredentialsFromAuth(result.data),
        redirect: false,
      });
      if (r?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>
      <Card className="w-full max-w-md border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle>
            {mode === "login" && "Sign in"}
            {mode === "register" && "Create workspace"}
            {mode === "join" && "Join workspace"}
          </CardTitle>
          <CardDescription>
            {mode === "register" &&
              "Creates a brand-new workspace: you are its only admin. Each email can only belong to one workspace—use Join workspace (or an invite) to enter an existing team instead of registering again."}
            {mode === "join" &&
              "Use the slug your admin shared. You will use Chat and dashboards only; the app generates validated SQL for you."}
            {mode === "login" && "Same account works for web and API."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="ws">Workspace name</Label>
                <Input id="ws" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} required />
              </div>
            )}
            {mode === "join" && (
              <div className="space-y-2">
                <Label htmlFor="slug">Workspace slug</Label>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  required
                  autoComplete="off"
                />
                {lookup && (
                  <p className="text-xs text-emerald-400/90">
                    Joining <strong>{lookup.name}</strong>
                    {!lookup.allow_self_serve_join && (
                      <span className="block text-amber-400 mt-1">
                        Invite-only workspace — you cannot self-register with this slug.
                      </span>
                    )}
                    {lookup.allow_self_serve_join && (
                      <span className="block text-[hsl(var(--muted-foreground))] mt-1">
                        New members get role: {lookup.default_join_role} (set by admin).
                      </span>
                    )}
                  </p>
                )}
                {lookupErr && mode === "join" && workspaceSlug.trim().length > 1 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{lookupErr}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (mode === "join" && lookup !== null && !lookup.allow_self_serve_join)}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Register" : "Join"}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => setMode("login")}>
              Sign in
            </button>
            <button
              type="button"
              className="text-[hsl(var(--primary))] hover:underline"
              onClick={() => setMode("register")}
            >
              New workspace
            </button>
            <button type="button" className="text-[hsl(var(--primary))] hover:underline" onClick={() => setMode("join")}>
              Join workspace
            </button>
            <Link href="/" className="ml-auto text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
