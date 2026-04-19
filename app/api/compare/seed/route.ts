import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() ?? "";
  if (!slug) return NextResponse.json({ result: null });

  const product = await db.product.findUnique({
    where: { slug, pageStatus: "complete" },
    select: { id: true, slug: true, productName: true, category: true, imageUrls: true, priceData: true },
  });

  if (!product) return NextResponse.json({ result: null });

  const images = product.imageUrls as string[] | null;
  const price = product.priceData as { display?: string } | null;

  return NextResponse.json({
    result: {
      id: product.id,
      slug: product.slug,
      productName: product.productName,
      category: product.category,
      thumb: images?.[0] ?? null,
      priceDisplay: price?.display ?? null,
    },
  });
}
