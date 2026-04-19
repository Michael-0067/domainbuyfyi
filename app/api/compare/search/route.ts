import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  // SQLite: contains is case-insensitive for ASCII — no mode: "insensitive" needed
  const products = await db.product.findMany({
    where: {
      pageStatus: "complete",
      productName: { contains: q },
    },
    orderBy: { lastGeneratedAt: "desc" },
    take: 12,
    select: {
      id: true, slug: true, productName: true, category: true,
      imageUrls: true, priceData: true,
    },
  });

  const results = products.map((p) => {
    const images = p.imageUrls as string[] | null;
    const price = p.priceData as { display?: string } | null;
    return {
      id: p.id,
      slug: p.slug,
      productName: p.productName,
      category: p.category,
      thumb: images?.[0] ?? null,
      priceDisplay: price?.display ?? null,
    };
  });

  return NextResponse.json({ results });
}
