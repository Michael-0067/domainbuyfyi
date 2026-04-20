import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { NICHE } from "@/lib/config";
import { GURU } from "@/lib/guru";
import type { GeneratedPageData } from "@/lib/generate/sections";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { productName: true, category: true, shortDescription: true },
  });
  if (!product) return {};

  return {
    title: product.productName,
    description: `Domain Brief: ${product.productName}. Structured analysis of this ${product.category ?? "domain"} listing — naming quality, commercial potential, and acquisition considerations.`,
    alternates: { canonical: `${SITE_URL}/briefs/${slug}` },
    openGraph: {
      title: product.productName,
      description: `Domain Brief by ${GURU.name} on ${SITE_NAME}`,
    },
  };
}

function domainVisitUrl(canonicalSourceUrl: string | null, productName: string): string {
  if (canonicalSourceUrl) {
    return canonicalSourceUrl.startsWith("http") ? canonicalSourceUrl : `https://${canonicalSourceUrl}`;
  }
  return `https://${productName}`;
}

function domainFacts(domain: string): { label: string; value: string }[] {
  const lastDot = domain.lastIndexOf(".");
  const ext = lastDot >= 0 ? domain.slice(lastDot) : "";
  const name = lastDot >= 0 ? domain.slice(0, lastDot) : domain;
  const digitMatches = name.match(/\d/g) ?? [];
  const hyphenMatches = name.match(/-/g) ?? [];
  return [
    { label: "Extension", value: ext || "—" },
    { label: "Total length", value: `${domain.length} characters` },
    { label: "Name length", value: `${name.length} characters` },
    { label: "Hyphens", value: hyphenMatches.length > 0 ? `Yes (${hyphenMatches.length})` : "No" },
    { label: "Numbers", value: digitMatches.length > 0 ? `Yes (${digitMatches.length} digit${digitMatches.length > 1 ? "s" : ""})` : "No" },
  ];
}

export default async function BriefPage({ params }: Props) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, productName: true, category: true,
      shortDescription: true, imageUrls: true, generatedPageData: true, briefContent: true,
      canonicalSourceUrl: true, lastGeneratedAt: true, pageStatus: true, createdAt: true,
      roundupItems: { select: { roundup: { select: { slug: true, title: true } } } },
    },
  });

  if (!product || product.pageStatus === "pending") notFound();

  const pageData = product.generatedPageData as GeneratedPageData | null;
  const visitUrl = domainVisitUrl(product.canonicalSourceUrl, product.productName);
  const facts = domainFacts(product.productName);
  const images = product.imageUrls as string[] | null;
  const landscapeImage = images?.[0] ?? null;

  const relatedBriefs = await db.product.findMany({
    where: {
      pageStatus: "complete",
      slug: { not: product.slug },
      createdAt: { lt: product.createdAt },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { slug: true, productName: true, category: true },
  });

  return (
    <div className="space-y-10">
      <Breadcrumb crumbs={[
        { label: "Home", href: "/" },
        { label: "Briefs", href: "/briefs" },
        { label: product.productName },
      ]} />

      {/* Domain header */}
      <div className="space-y-3">
        {product.category && (
          <Link href={`/briefs?category=${encodeURIComponent(product.category)}`}>
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>
              {product.category}
            </span>
          </Link>
        )}
        <h1 className="text-3xl font-bold leading-snug" style={{ color: "var(--text)" }}>
          {product.productName}
        </h1>
        <div className="flex gap-3 flex-wrap pt-1">
          <a
            href={visitUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "var(--accent)" }}
          >
            Visit Domain ↗
          </a>
          <Link
            href={`/compare?seed=${product.slug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity"
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            Compare this {NICHE.subject} →
          </Link>
        </div>
      </div>

      {/* Landscape painting */}
      {landscapeImage && (
        <div className="rounded-2xl overflow-hidden w-full" style={{ border: "1px solid var(--border)" }}>
          <img
            src={landscapeImage}
            alt={`Landscape impression of ${product.productName}`}
            className="w-full object-cover"
            style={{ aspectRatio: "900/506", display: "block" }}
          />
        </div>
      )}

      {/* Domain Analyst brief */}
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

      {/* What to Know Before You Buy */}
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

      {/* Domain Facts */}
      <section
        className="rounded-2xl p-6 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Domain Facts</h2>
        <dl>
          {facts.map(({ label, value }, i) => (
            <div
              key={label}
              className="flex gap-4 py-2 text-sm"
              style={{ borderBottom: i < facts.length - 1 ? "1px solid var(--border)" : undefined }}
            >
              <dt className="shrink-0 font-medium w-36" style={{ color: "var(--text-muted)" }}>{label}</dt>
              <dd style={{ color: "var(--text-secondary)" }}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Why Buy This Domain */}
      {pageData?.whyBuy && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Why Buy This Domain</h2>
          <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{pageData.whyBuy}</p>
        </section>
      )}

      {/* Contact CTA */}
      <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Interested in acquiring this domain?</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use the contact form to reach the site owner directly.</p>
        </div>
        <Link
          href="/contact"
          className="shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: "var(--accent)" }}
        >
          Contact Site Owner
        </Link>
      </div>

      {/* More Briefs */}
      {relatedBriefs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>More Briefs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedBriefs.map((r) => (
              <Link
                key={r.slug}
                href={`/briefs/${r.slug}`}
                className="rounded-xl overflow-hidden flex flex-col hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="h-16 flex items-center justify-center px-4"
                  style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)" }}
                >
                  <p className="text-base font-bold truncate" style={{ color: "var(--accent)" }}>{r.productName}</p>
                </div>
                <div className="p-3">
                  {r.category && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.category}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <p className="text-xs leading-relaxed pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        This Brief was prepared by the {GURU.name}, an AI analyst, using publicly available information about the domain name and its listing.
        {SITE_NAME} does not claim ownership of, affiliation with, or any rights to any domain featured on this site.
        Domain availability, pricing, and ownership status may change at any time — verify directly before making any acquisition decision.
      </p>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `Domain Brief: ${product.productName}`,
            description: product.shortDescription,
            author: { "@type": "Organization", name: SITE_NAME },
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
            url: `${SITE_URL}/briefs/${slug}`,
            dateModified: product.lastGeneratedAt,
          }),
        }}
      />
    </div>
  );
}
