/**
 * Ingest pipeline — resolves → normalizes → generates → stores.
 * Uses the single Guru instead of an agent pool.
 */

import { db } from "@/lib/db/prisma";
import { normalizeProduct } from "@/lib/normalize";
import { generatePageSections, classifyProductCategory } from "./sections";
import { generateProductArticle } from "./article";
import type { SerpApiProductResult } from "@/lib/ingestion/serpapi";
import type { Product } from "@/app/generated/prisma/client";

export async function ingestProduct(raw: SerpApiProductResult): Promise<Product> {
  const normalized = normalizeProduct(raw);

  const existing = await db.product.findFirst({
    where: { OR: [{ asin: normalized.asin }, { slug: normalized.slug }] },
  });

  if (existing && existing.pageStatus === "complete") return existing;

  const product = await db.product.upsert({
    where: { asin: normalized.asin ?? "" },
    create: {
      asin: normalized.asin,
      slug: normalized.slug,
      productName: normalized.productName,
      brand: normalized.brand,
      category: normalized.category,
      shortDescription: normalized.shortDescription,
      canonicalSourceUrl: normalized.canonicalSourceUrl,
      normalizedAttributes: normalized.normalizedAttributes as object,
      rawSourcePayload: raw.rawPayload as object,
      imageUrls: normalized.imageUrls,
      priceData: (normalized.priceData as object | null) ?? undefined,
      reviewSummaryData: normalized.reviewSummaryData as object,
      pageStatus: "generating",
    },
    update: {
      productName: normalized.productName,
      brand: normalized.brand,
      category: normalized.category,
      shortDescription: normalized.shortDescription,
      canonicalSourceUrl: normalized.canonicalSourceUrl,
      normalizedAttributes: normalized.normalizedAttributes as object,
      rawSourcePayload: raw.rawPayload as object,
      imageUrls: normalized.imageUrls,
      priceData: (normalized.priceData as object | null) ?? undefined,
      reviewSummaryData: normalized.reviewSummaryData as object,
      pageStatus: "generating",
    },
  });

  const [article, pageSections, assignedCategory] = await Promise.all([
    generateProductArticle(normalized),
    generatePageSections(normalized),
    classifyProductCategory(normalized.productName, normalized.normalizedAttributes.features, normalized.shortDescription),
  ]);

  return db.product.update({
    where: { id: product.id },
    data: {
      briefContent: article,
      generatedPageData: pageSections as object,
      category: assignedCategory,
      pageStatus: "complete",
      lastGeneratedAt: new Date(),
    },
  });
}
