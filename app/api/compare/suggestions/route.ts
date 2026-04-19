import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category")?.trim() ?? "";
  const excludeParam = req.nextUrl.searchParams.get("exclude") ?? "";
  const excludeIds = excludeParam ? excludeParam.split(",").filter(Boolean) : [];

  const products = await db.product.findMany({
    where: {
      pageStatus: "complete",
      ...(category ? { category } : {}),
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 6,
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
