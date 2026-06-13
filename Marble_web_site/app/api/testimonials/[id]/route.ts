import { requireAdminApi } from "@/lib/admin-auth";
import { approveTestimonial, rejectTestimonial } from "@/lib/testimonials";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "reject") {
      await rejectTestimonial(id);
      return NextResponse.json({ success: true, status: "rejected" });
    }

    const item = await approveTestimonial(id);
    return NextResponse.json(item);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update testimonial" }, { status: 500 });
  }
}
