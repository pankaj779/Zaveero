import { NextResponse } from "next/server";

import { getBackendUrl } from "@/lib/server-api";

export async function POST(req: Request) {
  const body = await req.json();
  const url = `${getBackendUrl()}/auth/join`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("[api/join] fetch failed:", url, e);
    return NextResponse.json(
      {
        detail:
          "Cannot reach the API server. If you use Docker, rebuild the frontend image so INTERNAL_API_URL=http://backend:8000 is set, or ensure the backend is running and reachable.",
      },
      { status: 502 },
    );
  }
}
