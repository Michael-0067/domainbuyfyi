import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { resolveInput } from "@/lib/ingestion/resolver";
import { ingestProduct } from "@/lib/generate/pipeline";

// Admin-only — no public access, no rate limiting needed
export async function POST(req: NextRequest) {
  const isAdmin = req.cookies.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: string;
  try {
    const body = (await req.json()) as { input?: unknown };
    input = typeof body.input === "string" ? body.input.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!input) return NextResponse.json({ error: "No input provided" }, { status: 400 });

  try {
    // Quick cache check
    const cached = await findCachedProduct(input);
    if (cached) return NextResponse.json({ slug: cached.slug, cached: true });

    const resolved = await resolveInput(input);
    if (!resolved) {
      return NextResponse.json({ error: "Could not find a product matching that input. Try a full Amazon URL or ASIN." }, { status: 404 });
    }

    const byAsin = await db.product.findFirst({
      where: { asin: resolved.product.asin, pageStatus: "complete" },
    });
    if (byAsin) return NextResponse.json({ slug: byAsin.slug, cached: true });

    const product = await ingestProduct(resolved.product);
    return NextResponse.json({ slug: product.slug, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ingest]", message);
    return NextResponse.json({ error: `Something went wrong: ${message}` }, { status: 500 });
  }
}

async function findCachedProduct(input: string) {
  const cleaned = input.trim();
  const bySlug = await db.product.findFirst({ where: { slug: cleaned, pageStatus: "complete" }, select: { slug: true } });
  if (bySlug) return bySlug;
  if (/^[A-Z0-9]{10}$/i.test(cleaned)) {
    return db.product.findFirst({ where: { asin: cleaned.toUpperCase(), pageStatus: "complete" }, select: { slug: true } });
  }
  return null;
}
