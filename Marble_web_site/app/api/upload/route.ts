import { requireAdminApi } from "@/lib/admin-auth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB (Cloudinary free tier friendly)

export async function POST(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const isVideo = (file.type || "").startsWith("video/");
    const folder = projectId
      ? `sanjana-stone-arts/projects/${projectId}`
      : "sanjana-stone-arts/temp";

    const uploaded = await uploadToCloudinary(buffer, {
      folder,
      resourceType: isVideo ? "video" : "image",
    });

    return NextResponse.json({ url: uploaded.url, publicId: uploaded.publicId });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
