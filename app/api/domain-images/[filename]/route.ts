import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  const filepath = path.join(process.cwd(), "public", "domain-images", filename);

  try {
    const buffer = await fs.readFile(filepath);
    const ext = filename.split(".").pop()!.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
