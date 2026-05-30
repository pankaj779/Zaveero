import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      email?: string | null;
      role?: string;
      workspaceId?: string;
      workspaceSlug?: string;
      workspaceName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: string;
    workspaceId?: string;
    workspaceSlug?: string;
    workspaceName?: string;
  }
}
