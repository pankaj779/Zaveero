import { saveAndSendInquiry } from "@/lib/inquiries";
import type { ContactFormData } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

function validate(data: ContactFormData): string | null {
  if (!data.name?.trim()) return "Name is required";
  if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    return "Valid email is required";
  if (!data.phone?.trim()) return "Phone is required";
  if (!data.message?.trim()) return "Message is required";
  return null;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const data: ContactFormData = await request.json();
    const error = validate(data);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const { emailed } = await saveAndSendInquiry(data);

    return NextResponse.json({
      success: true,
      emailed,
      message: emailed
        ? "Thank you! Your message has been sent successfully."
        : "Thank you! Your message has been saved. We will contact you shortly.",
    });
  } catch (err) {
    console.error("Contact form error:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Could not save message (${detail}). Please call us at +91 9900984570.`,
      },
      { status: 500 }
    );
  }
}
