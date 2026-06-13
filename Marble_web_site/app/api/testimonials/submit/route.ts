import { submitPublicTestimonial } from "@/lib/testimonials";
import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
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

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many reviews. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.quote?.trim() || body.quote.trim().length < 10) {
      return NextResponse.json(
        { error: "Please write at least a short review (10+ characters)" },
        { status: 400 }
      );
    }

    const rating = Number(body.rating);
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Please select a rating from 1 to 5" }, { status: 400 });
    }

    const { emailed, whatsapped } = await submitPublicTestimonial({
      name: body.name,
      role: body.role,
      quote: body.quote,
      rating,
    });

    return NextResponse.json({
      success: true,
      emailed,
      whatsapped,
      message:
        "Thank you! Your review has been submitted and will appear on the site after we approve it.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
