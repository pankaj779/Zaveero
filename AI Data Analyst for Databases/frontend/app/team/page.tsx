"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

type Policies = {
  allow_self_serve_join: boolean;
  default_join_role: string;
  analysts_can_manage_connections: boolean;
};

type Member = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

const roles = ["ADMIN", "ANALYST", "VIEWER"] as const;

export default function TeamPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const admin = session?.user?.role === "ADMIN";
  const qc = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<(typeof roles)[number]>("ANALYST");

  const { data: policies } = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: () => apiFetch<Policies>("/workspace/settings", token),
    enabled: !!token && admin,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members"],
    queryFn: () => apiFetch<Member[]>("/workspace/members", token),
    enabled: !!token && admin,
  });

  const [localPolicies, setLocalPolicies] = useState<Policies | null>(null);
  useEffect(() => {
    if (policies) setLocalPolicies(policies);
  }, [policies]);

  const savePolicies = useMutation({
    mutationFn: (p: Policies) =>
      apiFetch<Policies>("/workspace/settings", token, {
        method: "PATCH",
        body: JSON.stringify({
          allow_self_serve_join: p.allow_self_serve_join,
          default_join_role: p.default_join_role,
          analysts_can_manage_connections: p.analysts_can_manage_connections,
        }),
      }),
    onSuccess: (p) => {
      qc.setQueryData(["workspace-settings"], p);
      setLocalPolicies(p);
    },
  });

  const inviteMut = useMutation({
    mutationFn: () =>
      apiFetch<Member>("/workspace/members", token, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          password: invitePassword,
          role: inviteRole,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-members"] });
      setInviteEmail("");
      setInvitePassword("");
    },
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiFetch<Member>(`/workspace/members/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-members"] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/workspace/members/${id}`, token, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspace-members"] }),
  });

  const p = localPolicies;

  if (!admin) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-xl font-semibold">Team & access</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
          Only workspace admins can invite people, set roles, and configure access policies. Ask your admin if you need a
          Viewer or Analyst account.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Team & access</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          People use Chat and saved reports—no SQL required. Admins control who can connect data sources, run questions,
          and join via workspace slug. (Registering with “Create workspace” always makes a <strong>separate</strong>{" "}
          organization—use join or invite to add people to this one.)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite link & signup mode</CardTitle>
          <CardDescription className="space-y-2">
            <span className="block">
              Workspace slug: <code className="text-[hsl(var(--primary))]">{session?.user?.workspaceSlug}</code>
            </span>
            {session?.user?.workspaceSlug && (
              <span className="block text-xs text-[hsl(var(--muted-foreground))]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px]"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      `${window.location.origin}/login?mode=join&slug=${encodeURIComponent(session.user.workspaceSlug!)}`
                    )
                  }
                >
                  Copy join link
                </Button>
              </span>
            )}
            <span className="block">Share the link only when self-serve join matches your security policy.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!p && <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading policies…</p>}
          {p && (
            <>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={p.allow_self_serve_join}
                  onChange={(e) => setLocalPolicies({ ...p, allow_self_serve_join: e.target.checked })}
                />
                <span>
                  <span className="font-medium">Allow join with slug on the login page</span>
                  <span className="block text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                    When off, you must invite each person below with email + temporary password. Recommended for production.
                  </span>
                </span>
              </label>
              <div>
                <Label>Default role for slug join</Label>
                <select
                  className="mt-1 flex h-10 w-full max-w-xs rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
                  value={p.default_join_role}
                  onChange={(e) => setLocalPolicies({ ...p, default_join_role: e.target.value })}
                >
                  <option value="ANALYST">Analyst — ask questions, run reports</option>
                  <option value="VIEWER">Viewer — read-only (no new queries)</option>
                </select>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={p.analysts_can_manage_connections}
                  onChange={(e) =>
                    setLocalPolicies({ ...p, analysts_can_manage_connections: e.target.checked })
                  }
                />
                <span>
                  <span className="font-medium">Analysts may add databases & run metadata scans</span>
                  <span className="block text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
                    Turn off so only admins configure connections—best when IT owns data sources.
                  </span>
                </span>
              </label>
              <Button
                type="button"
                onClick={() => p && savePolicies.mutate(p)}
                disabled={savePolicies.isPending}
              >
                Save policies
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite member</CardTitle>
          <CardDescription>
            Creates their account in <strong>this</strong> workspace. Leave role as Analyst unless you intentionally want
            another admin (Team → promote later works too). Send them the temporary password you set here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div>
            <Label>Email</Label>
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} type="password" minLength={8} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as (typeof roles)[number])}
            >
              <option value="VIEWER">Viewer</option>
              <option value="ANALYST">Analyst</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <Button
            type="button"
            onClick={() => inviteMut.mutate()}
            disabled={inviteMut.isPending || !inviteEmail.trim() || invitePassword.length < 8}
          >
            Send invite
          </Button>
          {inviteMut.isError && (
            <p className="text-sm text-red-400">{(inviteMut.error as Error).message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            Roles: Admin (full), Analyst (ask + run), Viewer (browse only). Permission changes apply after the member
            signs out and back in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-[hsl(var(--border))]/70">
            {members.map((m) => (
              <li key={m.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium">{m.email}</p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{m.created_at}</p>
                </div>
                <select
                  className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 text-sm"
                  value={m.role}
                  onChange={(e) => roleMut.mutate({ id: m.id, role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="text-red-400 border-red-500/40"
                  onClick={() => {
                    if (confirm(`Remove ${m.email}?`)) removeMut.mutate(m.id);
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
