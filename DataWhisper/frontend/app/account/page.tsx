"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

export default function AccountPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (next !== again) {
      setErr("New passwords do not match");
      return;
    }
    if (next.length < 8) {
      setErr("New password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/change-password", token, {
        method: "POST",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setMsg("Password updated. Use it next time you sign in.");
      setCurrent("");
      setNext("");
      setAgain("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
        Signed in as {session?.user?.email} · Role {session?.user?.role}
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>If an admin invited you with a temporary password, replace it here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <Label>Current password</Label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div>
              <Label>New password</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
            </div>
            <div>
              <Label>Confirm new password</Label>
              <Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={8} />
            </div>
            {err && <p className="text-sm text-red-400">{err}</p>}
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
