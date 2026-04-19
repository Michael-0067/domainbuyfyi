import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { affiliateUrl, affiliateUrlFromAsin } from "@/lib/amazon";

function isAdmin(req: NextRequest) {
  return req.cookies.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const products = await db.product.findMany({
    where: {
      pageStatus: "complete",
      productName: { contains: q },
    },
    orderBy: { lastGeneratedAt: "desc" },
    take: 20,
    select: {
      id: true, slug: true, productName: true, category: true,
      imageUrls: true, priceData: true, canonicalSourceUrl: true,
      asin: true, lastGeneratedAt: true,
    },
  });

  const results = products.map((p) => {
    const images = p.imageUrls as string[] | null;
    const price = p.priceData as { display?: string } | null;
    let amazonUrl: string | null = null;
    if (p.canonicalSourceUrl) {
      try { amazonUrl = affiliateUrl(p.canonicalSourceUrl); } catch { /* skip */ }
    } else if (p.asin) {
      amazonUrl = affiliateUrlFromAsin(p.asin);
    }
    return {
      id: p.id,
      slug: p.slug,
      productName: p.productName,
      category: p.category,
      thumb: images?.[0] ?? null,
      priceDisplay: price?.display ?? null,
      lastGeneratedAt: p.lastGeneratedAt,
      briefUrl: `/briefs/${p.slug}`,
      amazonUrl,
    };
  });

  return NextResponse.json({ results });
}
