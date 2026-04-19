import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import { cookies } from "next/headers";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { NICHE } from "@/lib/config";

const GA_ID = "G-SSEF3PD2W3";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — ${NICHE.heroLine1} ${NICHE.heroLine2}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    `Structured ${NICHE.subject} product intelligence for smarter buying. Informed Briefs, side-by-side comparisons, and curated roundups — before you buy.`,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${NICHE.heroLine1} ${NICHE.heroLine2}`,
    description:
      `Structured ${NICHE.subject} product intelligence for smarter buying. Informed Briefs, side-by-side comparisons, and curated roundups — before you buy.`,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${NICHE.heroLine1} ${NICHE.heroLine2}`,
    description:
      `Structured ${NICHE.subject} product intelligence for smarter buying. Informed Briefs, side-by-side comparisons, and curated roundups — before you buy.`,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("vbf_admin")?.value === process.env.ADMIN_SECRET;

  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {/* Accent color injection — values come from lib/config.ts */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>

        <style>{`
          :root {
            --accent: ${NICHE.accent};
            --accent-light: ${NICHE.accentLight};
            --accent-hover: ${NICHE.accentHover};
          }
        `}</style>

        <header
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
          className="px-6 py-4"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span
                className="font-bold text-lg tracking-tight"
                style={{ color: "var(--accent)" }}
              >
                {SITE_NAME}
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/briefs" style={{ color: "var(--text-muted)" }} className="hover:opacity-80 transition-opacity">
                Briefs
              </Link>
              <Link href="/comparisons" style={{ color: "var(--text-muted)" }} className="hover:opacity-80 transition-opacity">
                Comparisons
              </Link>
              <Link href="/roundups" style={{ color: "var(--text-muted)" }} className="hover:opacity-80 transition-opacity">
                Roundups
              </Link>
              {isAdmin && (
                <>
                  <Link href="/admin" style={{ color: "var(--accent)" }} className="hover:opacity-80 transition-opacity font-medium">
                    Admin
                  </Link>
                  <a href="/api/admin/logout" style={{ color: "var(--text-muted)" }} className="hover:opacity-80 transition-opacity">
                    Logout
                  </a>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: `${SITE_URL}/og-default.png`,
            }),
          }}
        />

        <footer
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
          className="mt-20 px-6 py-8 text-sm text-center"
        >
          <p className="mb-3">{NICHE.footerTagline}</p>
          <p className="mb-3">
            {NICHE.footerCrossPromoIntro}{" "}
            <a
              href={NICHE.footerCrossPromoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              {NICHE.footerCrossPromoLink}
            </a>.
          </p>
          <p className="mt-3 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/compare" className="underline underline-offset-2 hover:opacity-80">Compare</Link>
            <Link href="/contact" className="underline underline-offset-2 hover:opacity-80">Contact</Link>
            <Link href="/privacy" className="underline underline-offset-2 hover:opacity-80">Privacy Policy</Link>
            <Link href="/terms" className="underline underline-offset-2 hover:opacity-80">Terms &amp; Conditions</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
