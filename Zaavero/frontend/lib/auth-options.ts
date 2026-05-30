import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getBackendUrl } from "@/lib/server-api";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accessToken: string;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
};

async function userFromPlatformToken(accessToken: string): Promise<AuthUser | null> {
  let res: Response;
  try {
    res = await fetch(`${getBackendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.user || !data?.workspace) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name ?? null,
    role: data.user.role,
    accessToken,
    workspaceId: data.workspace.id,
    workspaceSlug: data.workspace.slug,
    workspaceName: data.workspace.name,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        platformAccessToken: { label: "Platform token", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.platformAccessToken) {
          return userFromPlatformToken(credentials.platformAccessToken);
        }

        if (!credentials?.email || !credentials?.password) return null;
        const loginUrl = `${getBackendUrl()}/auth/login`;
        let res: Response;
        try {
          res = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
        } catch {
          return null;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.access_token || !data?.user || !data?.workspace) return null;
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          accessToken: data.access_token,
          workspaceId: data.workspace.id,
          workspaceSlug: data.workspace.slug,
          workspaceName: data.workspace.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.role = (user as { role?: string }).role;
        token.sub = user.id;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
        token.workspaceSlug = (user as { workspaceSlug?: string }).workspaceSlug;
        token.workspaceName = (user as { workspaceName?: string }).workspaceName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = token.role as string | undefined;
        session.user.workspaceId = token.workspaceId as string | undefined;
        session.user.workspaceSlug = token.workspaceSlug as string | undefined;
        session.user.workspaceName = token.workspaceName as string | undefined;
      }
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
