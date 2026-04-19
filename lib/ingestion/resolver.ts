import { fetchProductByAsin, searchProductByName, type SerpApiProductResult } from "./serpapi";

export interface ResolvedProduct {
  product: SerpApiProductResult;
}

export async function resolveInput(input: string): Promise<ResolvedProduct | null> {
  const cleaned = input.trim();
  const asin = extractAsin(cleaned);

  if (asin) {
    const product = await fetchProductByAsin(asin);
    if (!product) return null;
    return { product };
  }

  const results = await searchProductByName(cleaned);
  if (results.length === 0) return null;

  const product = await fetchProductByAsin(results[0].asin);
  if (!product) return null;
  return { product };
}

function extractAsin(input: string): string | null {
  if (/^[A-Z0-9]{10}$/i.test(input)) return input.toUpperCase();

  const urlPatterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
    /asin=([A-Z0-9]{10})/i,
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return null;
}
