import { NICHE } from "./config";

export const SITE_CATEGORIES = NICHE.categories;
export type SiteCategory = (typeof NICHE.categories)[number];

export function categoryToSlug(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function slugToCategory(slug: string): SiteCategory | undefined {
  return SITE_CATEGORIES.find((c) => categoryToSlug(c) === slug) as SiteCategory | undefined;
}
