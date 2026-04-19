import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { buildCanonicalKey, generateComparisonMeta } from "@/lib/generate/comparison";

export async function POST(req: NextRequest) {
  let slugs: string[];
  try {
    const body = (await req.json()) as { slugs?: unknown };
    if (!Array.isArray(body.slugs)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    slugs = body.slugs.filter((s): s is string => typeof s === "string").slice(0, 3);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (slugs.length < 2) return NextResponse.json({ error: "At least 2 products required" }, { status: 400 });

  // Fetch the products to get their IDs
  const products = await db.product.findMany({
    where: { slug: { in: slugs }, pageStatus: "complete" },
    select: { id: true, slug: true, productName: true },
  });

  if (products.length < 2) {
    return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
  }

  // Preserve the user's ordering
  const ordered = slugs
    .map((s) => products.find((p) => p.slug === s))
    .filter(Boolean) as typeof products;

  const productIds = ordered.map((p) => p.id);
  const canonicalKey = buildCanonicalKey(productIds);

  // Dedup check — AvsB === BvsA === CvsAvsB etc.
  const existing = await db.comparison.findUnique({ where: { canonicalKey }, select: { slug: true } });
  if (existing) return NextResponse.json({ slug: existing.slug });

  // Generate AI title + slug
  const productNames = ordered.map((p) => p.productName);
  const { title, slug: rawSlug } = await generateComparisonMeta(productNames);

  // Ensure slug is unique (append suffix if collision)
  let slug = rawSlug;
  let attempt = 0;
  while (await db.comparison.findUnique({ where: { slug }, select: { id: true } })) {
    attempt++;
    slug = `${rawSlug}-${attempt}`;
  }

  // Create the comparison
  const comparison = await db.comparison.create({
    data: {
      canonicalKey,
      slug,
      title,
      productIds,
      products: {
        create: ordered.map((p, i) => ({ productId: p.id, position: i })),
      },
    },
  });

  return NextResponse.json({ slug: comparison.slug });
}
