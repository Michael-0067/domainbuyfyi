import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db/prisma";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_URL } from "@/lib/site";
import { NICHE } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${NICHE.subjectLabel} Roundups`,
  description: `Curated ${NICHE.subject} roundups — informed collections covering ${NICHE.productDescription}.`,
  alternates: { canonical: `${SITE_URL}/roundups` },
};

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const PER_PAGE = 12;

export default async function RoundupsPage({ searchParams }: Props) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const skip = (page - 1) * PER_PAGE;

  const searchTerms = q?.trim()
    ? [q.trim(), q.trim().endsWith("s") ? q.trim().slice(0, -1) : q.trim() + "s"]
    : null;

  const where = {
    status: "published",
    ...(searchTerms
      ? {
          OR: searchTerms.flatMap((term) => [
            { title: { contains: term } },
            { introText: { contains: term } },
          ]),
        }
      : {}),
  };

  const [roundups, total] = await Promise.all([
    db.roundup.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: PER_PAGE,
      select: {
        id: true, slug: true, title: true, category: true,
        introText: true, publishedAt: true,
        items: { select: { id: true } },
      },
    }),
    db.roundup.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-8">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Roundups" }]} />

      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Roundups</h1>
        <p className="text-base max-w-xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Curated collections of {NICHE.subject} Briefs, grouped by type, use case, or price tier.
        </p>
      </div>

      {roundups.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
          {q ? `No roundups found for "${q}".` : "No roundups published yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {roundups.map((roundup) => (
            <Link
              key={roundup.id}
              href={`/roundups/${roundup.slug}`}
              className="flex items-start justify-between gap-4 rounded-xl px-5 py-4 hover:opacity-90 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="space-y-0.5 flex-1 min-w-0">
                {roundup.category && (
                  <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--accent)" }}>
                    {roundup.category}
                  </p>
                )}
                <h2 className="font-semibold text-sm leading-snug" style={{ color: "var(--text)" }}>
                  {roundup.title}
                </h2>
                {roundup.introText && (
                  <p className="text-xs leading-relaxed line-clamp-2 mt-1" style={{ color: "var(--text-muted)" }}>
                    {roundup.introText}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right space-y-1">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {roundup.items.length} brief{roundup.items.length !== 1 ? "s" : ""}
                </p>
                {roundup.publishedAt && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(roundup.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          {page > 1 && (
            <Link
              href={`/roundups?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page - 1}`}
              className="text-sm px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/roundups?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${page + 1}`}
              className="text-sm px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Next →
            </Link>
          )}
        </div>
      )}
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${NICHE.subjectLabel} Roundups`,
            url: `${SITE_URL}/roundups`,
            itemListElement: roundups.map((roundup, i) => ({
              "@type": "ListItem",
              position: skip + i + 1,
              name: roundup.title,
              url: `${SITE_URL}/roundups/${roundup.slug}`,
            })),
          }),
        }}
      />
    </div>
  );
}
