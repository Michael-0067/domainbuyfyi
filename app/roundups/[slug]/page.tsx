import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import RoundupCard from "./RoundupCard";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const roundup = await db.roundup.findUnique({
    where: { slug, status: "published" },
    select: { title: true, introText: true },
  });
  if (!roundup) return {};

  const description = roundup.introText?.slice(0, 160) ??
    `A ${SITE_NAME} roundup comparing ${roundup.title} — structured analysis, key facts, and buyer guidance.`;
  const ogImage = `${SITE_URL}/og-default.png`;

  return {
    title: roundup.title,
    description,
    alternates: { canonical: `${SITE_URL}/roundups/${slug}` },
    openGraph: {
      type: "article",
      title: roundup.title,
      description,
      url: `${SITE_URL}/roundups/${slug}`,
      siteName: SITE_NAME,
      images: [{ url: ogImage, width: 1200, height: 630, alt: roundup.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: roundup.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function RoundupPage({ params }: Props) {
  const { slug } = await params;

  const roundup = await db.roundup.findUnique({
    where: { slug, status: "published" },
    include: {
      items: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          titleSnapshot: true,
          categorySnapshot: true,
          priceSnapshot: true,
          thumbSnapshot: true,
          briefUrl: true,
          amazonUrl: true,
          generatedSummary: true,
        },
      },
    },
  });

  if (!roundup) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: roundup.title,
        ...(roundup.introText && { description: roundup.introText }),
        url: `${SITE_URL}/roundups/${slug}`,
        numberOfItems: roundup.items.length,
        itemListElement: roundup.items.map((item) => ({
          "@type": "ListItem",
          position: item.position,
          url: `${SITE_URL}${item.briefUrl}`,
          name: item.titleSnapshot,
        })),
      },
      {
        "@type": "Article",
        headline: roundup.title,
        ...(roundup.introText && { description: roundup.introText }),
        url: `${SITE_URL}/roundups/${slug}`,
        image: `${SITE_URL}/og-default.png`,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        ...(roundup.publishedAt && { datePublished: roundup.publishedAt.toISOString() }),
        dateModified: roundup.updatedAt.toISOString(),
      },
    ],
  };

  return (
    <div className="space-y-12">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Header ── */}
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Roundups", href: "/roundups" }, { label: roundup.title }]} />
      <div className="space-y-3 pt-2">
        {roundup.category && (
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {roundup.category}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ color: "var(--text)" }}>
          {roundup.title}
        </h1>
        {roundup.introText && (
          <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {roundup.introText}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {roundup.items.length} Product Brief{roundup.items.length !== 1 ? "s" : ""} compared
          {roundup.publishedAt && (
            <> · {new Date(roundup.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</>
          )}
        </p>
      </div>

      {/* ── Cards ── */}
      <div className="space-y-6">
        {roundup.items.map((item, idx) => (
          <RoundupCard key={item.id} item={item} index={idx} />
        ))}
      </div>

      {/* ── Closing ── */}
      {roundup.closingText && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {roundup.closingText}
          </p>
        </div>
      )}

      {/* ── Disclosure ── */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {SITE_NAME} roundup summaries are derived from existing Product Briefs — structured
          analyses prepared by the Buying Analyst, an AI agent, from publicly available product data
          and aggregated buyer feedback. Amazon links include an affiliate tag; clicking them
          may result in a commission at no additional cost to you.{" "}
          <a href="/terms" className="underline underline-offset-2 hover:opacity-80" style={{ color: "var(--accent)" }}>
            Terms →
          </a>
        </p>
      </div>

    </div>
  );
}
