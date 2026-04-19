import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { NICHE } from "@/lib/config";
import { affiliateUrl, affiliateUrlFromAsin } from "@/lib/amazon";
import { GURU } from "@/lib/guru";
import type { GeneratedPageData } from "@/lib/generate/sections";
import type { NormalizedAttributes, PriceData, ReviewSummaryData } from "@/lib/normalize";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { productName: true, brand: true, category: true, imageUrls: true },
  });
  if (!product) return {};

  const images = product.imageUrls as string[] | null;
  const thumb = images?.[0];

  return {
    title: product.productName,
    description: `${product.brand ? `${product.brand} — ` : ""}Informed ${NICHE.subject} Brief: ${product.productName}. Structured analysis on ${product.category ?? NICHE.subject} products.`,
    alternates: { canonical: `${SITE_URL}/briefs/${slug}` },
    openGraph: {
      title: product.productName,
      description: `Informed ${NICHE.subject} Brief by ${GURU.name} on ${SITE_NAME}`,
      images: thumb ? [{ url: thumb }] : [],
    },
  };
}

export default async function BriefPage({ params }: Props) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, productName: true, brand: true, category: true,
      shortDescription: true, imageUrls: true, priceData: true, reviewSummaryData: true,
      normalizedAttributes: true, generatedPageData: true, briefContent: true,
      canonicalSourceUrl: true, asin: true, lastGeneratedAt: true, pageStatus: true, createdAt: true,
      roundupItems: { select: { roundup: { select: { slug: true, title: true } } } },
    },
  });

  if (!product || product.pageStatus === "pending") notFound();

  const pageData = product.generatedPageData as GeneratedPageData | null;
  const attrs = product.normalizedAttributes as NormalizedAttributes | null;
  const priceData = product.priceData as PriceData | null;
  const reviewData = product.reviewSummaryData as ReviewSummaryData | null;
  const images = product.imageUrls as string[] | null;
  const ri = pageData?.reviewIntelligence;

  let amazonHref: string | null = null;
  if (product.canonicalSourceUrl) {
    try { amazonHref = affiliateUrl(product.canonicalSourceUrl); } catch { /* skip */ }
  } else if (product.asin) {
    amazonHref = affiliateUrlFromAsin(product.asin);
  }

  const specs = attrs?.specifications ? Object.entries(attrs.specifications).slice(0, 12) : [];
  const features = attrs?.features ?? [];

  const relatedBriefs = await db.product.findMany({
    where: {
      pageStatus: "complete",
      slug: { not: product.slug },
      createdAt: { lt: product.createdAt },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { slug: true, productName: true, imageUrls: true, priceData: true },
  });

  return (
    <div className="space-y-10">
      <Breadcrumb crumbs={[
        { label: "Home", href: "/" },
        { label: "Briefs", href: "/briefs" },
        { label: product.productName },
      ]} />

      {/* Product header */}
      <div className="flex flex-col sm:flex-row gap-6">
        {images?.[0] && (
          <div
            className="shrink-0 flex items-center justify-center rounded-2xl w-full sm:w-48 h-48"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}
          >
            <Image src={images[0]} alt={product.productName} width={160} height={160} className="max-h-44 w-auto object-contain" />
          </div>
        )}
        <div className="space-y-3 flex-1">
          {product.category && (
            <Link href={`/briefs?category=${encodeURIComponent(product.category)}`}>
              <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>
                {product.category}
              </span>
            </Link>
          )}
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--text)" }}>
            {product.productName}
          </h1>
          {product.brand && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{product.brand}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            {priceData?.display && (
              <span className="text-xl font-bold" style={{ color: "var(--accent)" }}>{priceData.display}</span>
            )}
            {reviewData?.rating != null && (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                ★ {reviewData.rating.toFixed(1)}
                {reviewData.ratingsTotal != null && ` · ${reviewData.ratingsTotal.toLocaleString()} ratings`}
              </span>
            )}
          </div>
          <div className="flex gap-3 flex-wrap pt-1">
            {amazonHref && (
              <a
                href={amazonHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: "var(--accent)" }}
              >
                View on Amazon ↗
              </a>
            )}
            <Link
              href={`/compare?seed=${product.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Compare this {NICHE.subject} →
            </Link>
          </div>
        </div>
      </div>

      {/* Informed Brief */}
      {product.briefContent && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {GURU.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{GURU.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {SITE_NAME}
                {product.lastGeneratedAt && (
                  <> · {new Date(product.lastGeneratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                )}
              </p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none space-y-4">
            {product.briefContent.split("\n\n").map((para, i) => (
              <p key={i} className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* What to Know */}
      {pageData?.whatToKnow && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>What to Know Before You Buy</h2>
          <ul className="space-y-2">
            {pageData.whatToKnow.split("\n").filter((l) => l.trim()).map((line, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0 mt-1 font-bold" style={{ color: "var(--accent)" }}>›</span>
                {line.replace(/^-\s*/, "")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Review Intelligence */}
      {ri && (ri.commonPraise.length > 0 || ri.commonComplaints.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Review Intelligence</h2>
          {ri.overallPattern && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{ri.overallPattern}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ri.commonPraise.length > 0 && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#16a34a" }}>Buyers Liked</p>
                <ul className="space-y-1.5">
                  {ri.commonPraise.map((item, i) => (
                    <li key={i} className="text-sm leading-snug flex gap-2" style={{ color: "var(--text-secondary)" }}>
                      <span className="shrink-0" style={{ color: "#16a34a" }}>+</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ri.commonComplaints.length > 0 && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#dc2626" }}>Buyers Flagged</p>
                <ul className="space-y-1.5">
                  {ri.commonComplaints.map((item, i) => (
                    <li key={i} className="text-sm leading-snug flex gap-2" style={{ color: "var(--text-secondary)" }}>
                      <span className="shrink-0" style={{ color: "#dc2626" }}>−</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {ri.mixedObservations.length > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Mixed Observations</p>
              <ul className="space-y-1.5">
                {ri.mixedObservations.map((item, i) => (
                  <li key={i} className="text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>· {item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Key Facts */}
      {pageData?.keyFactsSummary && (
        <section
          className="rounded-2xl p-6 space-y-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Key Facts</h2>
          <ul className="space-y-2">
            {pageData.keyFactsSummary.split("\n").filter((l) => l.trim()).map((line, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0 mt-1" style={{ color: "var(--accent)" }}>›</span>
                {line.replace(/^-\s*/, "")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Specs */}
      {specs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Specifications</h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <dl>
              {specs.map(([k, v], i) => (
                <div
                  key={k}
                  className="flex gap-4 px-4 py-2.5 text-sm"
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-alt)",
                    borderBottom: i < specs.length - 1 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <dt className="shrink-0 font-medium w-40" style={{ color: "var(--text-muted)" }}>{k}</dt>
                  <dd style={{ color: "var(--text-secondary)" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Listed Features</h2>
          <ul className="space-y-1.5">
            {features.map((f, i) => (
              <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: "var(--text-secondary)" }}>
                <span className="shrink-0" style={{ color: "var(--accent)" }}>·</span>{f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Amazon CTA */}
      {amazonHref && (
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Ready to check pricing?</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{SITE_NAME} earns a small commission on Amazon purchases at no extra cost to you.</p>
          </div>
          <a
            href={amazonHref}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)" }}
          >
            View on Amazon ↗
          </a>
        </div>
      )}

      {/* Related Briefs */}
      {relatedBriefs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            More Briefs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedBriefs.map((r) => {
              const rImages = r.imageUrls as string[] | null;
              const rPrice = r.priceData as PriceData | null;
              return (
                <Link
                  key={r.slug}
                  href={`/briefs/${r.slug}`}
                  className="rounded-xl overflow-hidden flex flex-col hover:opacity-90 transition-opacity"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="h-28 flex items-center justify-center" style={{ background: "var(--surface-alt)" }}>
                    {rImages?.[0] ? (
                      <Image src={rImages[0]} alt={r.productName} width={96} height={96} className="max-h-24 w-auto object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded" style={{ background: "var(--border)" }} />
                    )}
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium leading-snug" style={{ color: "var(--text)" }}>{r.productName}</p>
                    {rPrice?.display && <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>{rPrice.display}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Methodology note */}
      <p className="text-xs leading-relaxed pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        This Brief was prepared by the Buying Analyst, an AI agent, from publicly available product data including specifications, listed features, and customer review patterns.
        {SITE_NAME} does not claim to have purchased, tested, or owned any product featured on this site.
      </p>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.productName,
            brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
            description: product.shortDescription,
            image: images?.[0],
            offers: priceData?.value
              ? {
                  "@type": "Offer",
                  price: priceData.value,
                  priceCurrency: priceData.currency,
                  availability: "https://schema.org/InStock",
                  url: amazonHref,
                }
              : undefined,
            aggregateRating: reviewData?.rating
              ? {
                  "@type": "AggregateRating",
                  ratingValue: reviewData.rating,
                  reviewCount: reviewData.ratingsTotal ?? undefined,
                }
              : undefined,
          }),
        }}
      />
    </div>
  );
}
