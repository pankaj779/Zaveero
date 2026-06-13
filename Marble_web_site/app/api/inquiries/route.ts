import { requireAdminApi } from "@/lib/admin-auth";
import { getInquiries } from "@/lib/inquiries";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inquiries = await getInquiries();
  return NextResponse.json(inquiries);
}
