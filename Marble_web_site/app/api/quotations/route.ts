import { auth } from "@/lib/auth";
import { getQuotations, saveAndSendGuestQuotation } from "@/lib/quotations";
import type { QuotationFormData } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quotations = await getQuotations();
  return NextResponse.json(quotations);
}

export async function POST(request: NextRequest) {
  try {
    const body: QuotationFormData = await request.json();

    if (!body.clientName?.trim() || !body.clientPhone?.trim()) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    if (!body.projectTitle?.trim() || !body.location?.trim() || !body.description?.trim()) {
      return NextResponse.json(
        { error: "Project title, location, and description are required" },
        { status: 400 }
      );
    }

    if (!body.items?.length) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const { quotation, emailed, clientEmailed, emailError } =
      await saveAndSendGuestQuotation(body);

    const message = emailed
      ? "Thank you! Your quotation has been submitted."
      : "Thank you! Your quotation has been saved. We will review it shortly.";

    return NextResponse.json({
      success: true,
      referenceCode: quotation.referenceCode,
      emailed,
      clientEmailed,
      message,
      emailError,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit quotation" }, { status: 500 });
  }
}
