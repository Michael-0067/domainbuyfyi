import type { MetadataRoute } from "next";
import { db } from "@/lib/db/prisma";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, roundups, comparisons] = await Promise.all([
    db.product.findMany({
      where: { pageStatus: "complete" },
      select: { slug: true, lastGeneratedAt: true },
      orderBy: { lastGeneratedAt: "desc" },
    }),
    db.roundup.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    }),
    db.comparison.findMany({
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/briefs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/comparisons`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/roundups`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/compare`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const briefPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/briefs/${p.slug}`,
    lastModified: p.lastGeneratedAt ?? undefined,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const roundupPages: MetadataRoute.Sitemap = roundups.map((r) => ({
    url: `${SITE_URL}/roundups/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const comparisonPages: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${SITE_URL}/compare/${c.slug}`,
    lastModified: c.createdAt,
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticPages, ...briefPages, ...roundupPages, ...comparisonPages];
}
