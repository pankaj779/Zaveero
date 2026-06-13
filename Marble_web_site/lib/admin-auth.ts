import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/admin/login");
  }
  return session;
}

export async function requireAdminApi() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return null;
  }
  return session;
}
