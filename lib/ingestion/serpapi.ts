/**
 * SerpAPI product data fetcher — identical to smartbuy, shared pattern.
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY!;
const SERPAPI_BASE = "https://serpapi.com/search";

export interface SerpApiReviewInsight {
  title: string;
  sentiment: "positive" | "negative" | "mixed" | string;
  mentionsTotal: number;
  mentionsPositive: number;
  mentionsNegative: number;
  summary: string;
  snippets: string[];
}

export interface SerpApiProductResult {
  asin: string;
  title: string;
  brand?: string;
  price?: string;
  priceRaw?: number;
  rating?: number;
  ratingsTotal?: number;
  mainImage?: string;
  images?: string[];
  features?: string[];
  description?: string;
  specifications?: Record<string, string>;
  category?: string;
  canonicalUrl?: string;
  reviewSummaryText?: string;
  reviewInsights?: SerpApiReviewInsight[];
  authorReviews?: { rating: number; text: string }[];
  rawPayload: Record<string, unknown>;
}

export async function fetchProductByAsin(asin: string): Promise<SerpApiProductResult | null> {
  if (!SERPAPI_KEY) throw new Error("SERPAPI_KEY is not set");

  const params = new URLSearchParams({ engine: "amazon_product", asin, api_key: SERPAPI_KEY });
  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) throw new Error(`SerpAPI request failed (${res.status})`);

  const data = (await res.json()) as Record<string, unknown>;
  if (data.error) throw new Error(`SerpAPI error: ${data.error}`);

  const result = parseProductPayload(data, asin);

  if (result.authorReviews?.length === 0 && result.reviewInsights?.length === 0) {
    const supplemental = await fetchSupplementalReviews(asin);
    if (supplemental.length > 0) {
      result.authorReviews = supplemental;
      (result.rawPayload as Record<string, unknown>).supplemental_reviews = supplemental;
    }
  }

  return result;
}

async function fetchSupplementalReviews(asin: string): Promise<{ rating: number; text: string }[]> {
  try {
    const params = new URLSearchParams({ engine: "amazon_reviews", asin, api_key: SERPAPI_KEY });
    const res = await fetch(`${SERPAPI_BASE}?${params}`);
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, unknown>;
    if (data.error) return [];
    const reviews = ((data.customer_reviews ?? data.reviews) as Array<Record<string, unknown>>) ?? [];
    return reviews
      .filter((r) => r.body || r.content || r.text)
      .slice(0, 10)
      .map((r) => ({
        rating: Number(r.rating ?? 3),
        text: String(r.body ?? r.content ?? r.text ?? "").slice(0, 500),
      }));
  } catch {
    return [];
  }
}

export async function searchProductByName(query: string): Promise<{ asin: string; title: string; url: string }[]> {
  if (!SERPAPI_KEY) throw new Error("SERPAPI_KEY is not set");

  const params = new URLSearchParams({ engine: "amazon", k: query, api_key: SERPAPI_KEY });
  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) throw new Error(`SerpAPI search failed (${res.status})`);

  const data = (await res.json()) as Record<string, unknown>;
  if (data.error) throw new Error(`SerpAPI error: ${data.error}`);

  const results = (data.organic_results as Array<Record<string, unknown>>) ?? [];
  return results
    .filter((r) => r.asin)
    .slice(0, 5)
    .map((r) => ({
      asin: String(r.asin),
      title: String(r.title ?? ""),
      url: String(r.link ?? `https://www.amazon.com/dp/${r.asin}`),
    }));
}

function extractReviewData(data: Record<string, unknown>) {
  const ri = data.reviews_information as {
    summary?: { text?: string; insights?: Array<Record<string, unknown>> };
    authors_reviews?: Array<Record<string, unknown>>;
  } | undefined;

  if (!ri) return {};

  const summaryText = ri.summary?.text ?? undefined;
  const insights: SerpApiReviewInsight[] = (ri.summary?.insights ?? []).map((ins) => {
    const mentions = ins.mentions as { total?: number; positive?: number; negative?: number } | undefined;
    const examples = (ins.examples as Array<{ snippet?: string }> | undefined) ?? [];
    return {
      title: String(ins.title ?? ""),
      sentiment: String(ins.sentiment ?? ""),
      mentionsTotal: Number(mentions?.total ?? 0),
      mentionsPositive: Number(mentions?.positive ?? 0),
      mentionsNegative: Number(mentions?.negative ?? 0),
      summary: String(ins.summary ?? ""),
      snippets: examples.map((e) => e.snippet ?? "").filter(Boolean).slice(0, 3),
    };
  });

  const authorReviews: { rating: number; text: string }[] = (ri.authors_reviews ?? [])
    .filter((r) => r.text)
    .slice(0, 10)
    .map((r) => ({ rating: Number(r.rating ?? 3), text: String(r.text ?? "").slice(0, 500) }));

  return { summaryText, insights, authorReviews };
}

export function parseProductPayload(data: Record<string, unknown>, asin: string): SerpApiProductResult {
  const summary = data.product_results as Record<string, unknown> | undefined;

  const specsMap: Record<string, string> = {};
  const itemSpecs = data.item_specifications as Record<string, string> | undefined;
  if (itemSpecs && typeof itemSpecs === "object" && !Array.isArray(itemSpecs)) {
    for (const [k, v] of Object.entries(itemSpecs)) {
      if (typeof v === "string") specsMap[k] = v;
    }
  }
  const specsArray = data.specifications as Array<Record<string, string>> | undefined;
  if (Array.isArray(specsArray)) {
    for (const row of specsArray) {
      if (row.name && row.value) specsMap[row.name] = row.value;
    }
  }

  const priceRaw = extractPrice(summary?.price);
  const images = extractImages(data);
  const { summaryText, insights, authorReviews: extractedReviews } = extractReviewData(data);
  const supplementalReviews = (data.supplemental_reviews as { rating: number; text: string }[] | undefined) ?? [];
  const authorReviews = extractedReviews?.length ? extractedReviews : supplementalReviews;

  return {
    asin,
    title: String(summary?.title ?? data.title ?? ""),
    brand: extractBrand(summary, specsMap),
    price: summary?.price ? String(summary.price) : undefined,
    priceRaw,
    rating: summary?.rating ? Number(summary.rating) : undefined,
    ratingsTotal: summary?.reviews
      ? Number(summary.reviews)
      : summary?.ratings_total
      ? Number(summary.ratings_total)
      : undefined,
    mainImage: images[0],
    images,
    features: extractFeatures(data),
    description: extractDescription(data),
    specifications: specsMap,
    category: extractCategory(data),
    canonicalUrl: `https://www.amazon.com/dp/${asin}`,
    reviewSummaryText: summaryText,
    reviewInsights: insights,
    authorReviews,
    rawPayload: data,
  };
}

function extractPrice(price: unknown): number | undefined {
  if (!price) return undefined;
  const str = String(price).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function extractBrand(summary: Record<string, unknown> | undefined, specs: Record<string, string>): string | undefined {
  const raw = summary?.brand
    ? String(summary.brand)
    : specs["brand"] ?? specs["Brand"] ?? specs["Manufacturer"] ?? undefined;
  if (!raw) return undefined;
  return raw.replace(/^Visit the\s+/i, "").replace(/\s+Store$/i, "").trim() || undefined;
}

function extractImages(data: Record<string, unknown>): string[] {
  const summary = data.product_results as Record<string, unknown> | undefined;
  if (Array.isArray(summary?.thumbnails)) return (summary.thumbnails as string[]).filter(Boolean).slice(0, 10);
  const mediaGallery = data.media_gallery as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(mediaGallery)) {
    return mediaGallery.filter((m) => m.type === "image" && m.link).map((m) => String(m.link)).slice(0, 10);
  }
  if (summary?.thumbnail) return [String(summary.thumbnail)];
  return [];
}

function extractFeatures(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.about_item)) {
    const items = (data.about_item as unknown[]).filter((f) => typeof f === "string");
    if (items.length > 0) return items.slice(0, 10) as string[];
  }
  const summary = data.product_results as Record<string, unknown> | undefined;
  const features = (summary?.feature_bullets as string[]) ?? (data.feature_bullets as string[]) ?? [];
  return Array.isArray(features) ? features.slice(0, 10) : [];
}

function extractDescription(data: Record<string, unknown>): string | undefined {
  if (Array.isArray(data.about_item) && data.about_item.length > 0) {
    const first = (data.about_item as unknown[])[0];
    if (typeof first === "string") return first;
  }
  const summary = data.product_results as Record<string, unknown> | undefined;
  if (typeof summary?.description === "string") return summary.description;
  return undefined;
}

function extractCategory(data: Record<string, unknown>): string | undefined {
  const breadcrumbs = data.breadcrumbs as Array<Record<string, string>> | undefined;
  if (Array.isArray(breadcrumbs) && breadcrumbs.length > 1) {
    return breadcrumbs[breadcrumbs.length - 1]?.name;
  }
  return undefined;
}
