import { NICHE } from "./config";

export function affiliateUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("tag", NICHE.affiliateTag);
    return u.toString();
  } catch {
    return url;
  }
}

export function affiliateUrlFromAsin(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${NICHE.affiliateTag}`;
}
