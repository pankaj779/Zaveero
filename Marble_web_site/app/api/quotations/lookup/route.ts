import { lookupGuestQuotation } from "@/lib/quotations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const referenceCode = searchParams.get("referenceCode") ?? searchParams.get("ref") ?? "";
  const phone = searchParams.get("phone") ?? "";

  if (!referenceCode.trim() || !phone.trim()) {
    return NextResponse.json(
      { error: "Reference code and phone number are required" },
      { status: 400 }
    );
  }

  const quotation = await lookupGuestQuotation(referenceCode, phone);

  if (!quotation) {
    return NextResponse.json(
      { error: "No quotation found. Check your reference number and phone." },
      { status: 404 }
    );
  }

  return NextResponse.json(quotation);
}
