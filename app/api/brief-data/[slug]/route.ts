import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import type { GeneratedPageData } from "@/lib/generate/sections";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { productName: true, generatedPageData: true, pageStatus: true },
  });

  if (!product || product.pageStatus !== "complete") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pageData = product.generatedPageData as GeneratedPageData | null;

  return NextResponse.json(
    {
      domain: product.productName,
      whyBuy: pageData?.whyBuy ?? null,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
