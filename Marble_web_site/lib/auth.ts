import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import { verifyUser } from "@/lib/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;

        const user = await verifyUser(email, password);
        if (!user || user.role !== "admin") return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "admin" as const,
        };
      },
    }),
  ],
});
