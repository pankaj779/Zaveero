import { requireAdminApi } from "@/lib/admin-auth";
import { updateUserPassword } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }

    await updateUserPassword(session.user.id, currentPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update password";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
