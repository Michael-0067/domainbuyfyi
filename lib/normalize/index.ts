/**
 * Normalizer — converts raw SerpAPI product data into a clean internal model.
 */

import type { SerpApiProductResult, SerpApiReviewInsight } from "@/lib/ingestion/serpapi";

export interface NormalizedProduct {
  asin: string;
  productName: string;
  brand: string | null;
  category: string | null;
  shortDescription: string | null;
  canonicalSourceUrl: string;
  slug: string;
  normalizedAttributes: NormalizedAttributes;
  imageUrls: string[];
  priceData: PriceData | null;
  reviewSummaryData: ReviewSummaryData;
}

export interface NormalizedAttributes {
  features: string[];
  specifications: Record<string, string>;
  dimensions?: string;
  weight?: string;
  material?: string;
  colorOptions?: string;
  powerSource?: string;
  includedComponents?: string;
  targetUseCase?: string;
}

export interface PriceData {
  display: string | null;
  value: number | null;
  currency: string;
}

export interface ReviewSummaryData {
  rating: number | null;
  ratingsTotal: number | null;
  reviews: { rating: number; text: string }[];
  insights: SerpApiReviewInsight[];
}

export function normalizeProduct(raw: SerpApiProductResult): NormalizedProduct {
  const specs = raw.specifications ?? {};

  const attributes: NormalizedAttributes = {
    features: raw.features ?? [],
    specifications: specs,
    dimensions:
      specs["product_dimensions"] ??
      specs["Item Dimensions"] ??
      specs["Package Dimensions"] ??
      specs["Product Dimensions"] ??
      undefined,
    weight:
      specs["item_weight"] ??
      specs["Item Weight"] ??
      specs["Product Weight"] ??
      undefined,
    material:
      specs["material"] ??
      specs["Material"] ??
      specs["Frame Material"] ??
      undefined,
    colorOptions: specs["color"] ?? specs["Color"] ?? undefined,
    powerSource: specs["power_source"] ?? specs["Power Source"] ?? undefined,
    includedComponents:
      specs["included_components"] ?? specs["Included Components"] ?? undefined,
    targetUseCase:
      specs["recommended_uses_for_product"] ??
      specs["Recommended Uses For Product"] ??
      undefined,
  };

  const priceData: PriceData | null = raw.price
    ? { display: raw.price, value: raw.priceRaw ?? null, currency: "USD" }
    : null;

  const reviewSummary: ReviewSummaryData = {
    rating: raw.rating ?? null,
    ratingsTotal: raw.ratingsTotal ?? null,
    reviews: (raw.authorReviews ?? []).slice(0, 20),
    insights: raw.reviewInsights ?? [],
  };

  const slug = generateSlug(raw.title, raw.asin);

  return {
    asin: raw.asin,
    productName: raw.title,
    brand: raw.brand ?? null,
    category: raw.category ?? null,
    shortDescription: raw.description ?? null,
    canonicalSourceUrl: raw.canonicalUrl ?? `https://www.amazon.com/dp/${raw.asin}`,
    slug,
    normalizedAttributes: attributes,
    imageUrls: raw.images ?? (raw.mainImage ? [raw.mainImage] : []),
    priceData,
    reviewSummaryData: reviewSummary,
  };
}

function generateSlug(title: string, asin: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base}-${asin.toLowerCase()}`;
}
