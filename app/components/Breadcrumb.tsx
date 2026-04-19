import Link from "next/link";
import { SITE_URL } from "@/lib/site";

interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
          {crumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:underline underline-offset-2" style={{ color: "var(--text-muted)" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "var(--text-secondary)" }}>{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: crumbs.map((crumb, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: crumb.label,
              ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
            })),
          }),
        }}
      />
    </>
  );
}
