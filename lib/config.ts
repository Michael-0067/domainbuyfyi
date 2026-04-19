/**
 * NICHE CONFIG — the single file to edit when personalising this template for a new site.
 * All niche-specific values live here. The rest of the codebase reads from this file.
 */

export const NICHE = {
  // ── Site identity ──────────────────────────────────────────────────────────
  name: "Domain Buy FYI",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://domainbuy.fyi")
    .replace(/^https:\/\/www\./, "https://"),

  // ── Product niche ──────────────────────────────────────────────────────────
  subject: "domain",                              // singular noun, lowercase
  subjectPlural: "domains",                       // plural noun, lowercase
  subjectLabel: "Domain",                         // title-case label for headings, e.g. "Vacuum Briefs"
  productDescription: "for-sale domain names and domain portfolio listings",

  // ── Product categories ─────────────────────────────────────────────────────
  // Used for browse filters and AI classification. "Other" must always be last.
  // Keep these high-level — 6 to 10 categories works best.
  categories: [
    "Brandable Domains",
    "Keyword Domains",
    "Geo Domains",
    "Exact Match Domains",
    "Aged Domains",
    "Premium Domains",
    "Short Domains",
    "Niche Domains",
    "Domain Bundles",
    "Other",
  ] as const satisfies readonly string[],

  // ── Contact ────────────────────────────────────────────────────────────────
  contactEmail: "hello@domainbuy.fyi",

  // ── Affiliate ──────────────────────────────────────────────────────────────
  affiliateTag: "domainbuyfyi-20",

  // ── Accent colors ──────────────────────────────────────────────────────────
  // These are injected as CSS variables at runtime and override globals.css.
  accent:      "#000080",
  accentLight: "#e6e9f7",
  accentHover: "#000066",

  // ── Homepage hero ──────────────────────────────────────────────────────────
  heroLine1:      "Domain intelligence,",
  heroLine2:      "before you buy.",
  heroSubtext:    "Informed Briefs on for-sale domain names and domain portfolio listings — structured, analytical, and free of hype. Compare side by side. Read the roundups. Buy with clarity.",
  heroCtaPrimary: "Compare Domains →",

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerTagline:           "Domain Buy FYI provides structured domain listing analysis based on publicly available information.",
  footerCrossPromoIntro:   "Domains not your thing?",
  footerCrossPromoLink:    "For a variety of retail comparisons, visit SmartBuy.FYI",
  footerCrossPromoUrl:     "https://smartbuy.fyi",

  // ── AI Analyst persona ─────────────────────────────────────────────────────
  guru: {
    name:   "Domain Analyst",
    slug:   "domain-analyst",
    model:  process.env.MODEL_GURU_ARTICLE ?? "gpt-5.4-mini",
    systemPrompt: `You are the Domain Analyst, a specialist in evaluating domain names, domain portfolios, and digital naming opportunities across a wide range of styles, niches, and price tiers.

Your approach is methodical and evidence-based. You assess naming quality, commercial utility, brand potential, search relevance, memorability, extension fit, and resale positioning. You are not impressed by hype, inflated valuations, or vague claims about "premium" quality. You care about what a domain is, what makes it useful or weak, who it may suit, and what kind of opportunity it may realistically represent.

You write for buyers who want to understand a domain before they acquire it — not to be dazzled by sales language. Your voice is direct, organized, and precise. You surface weaknesses, risks, and uncertainty without hesitation. You do not hype.

Your focus: brandable domains, keyword domains, geo domains, exact match domains, aged domains, short domains, niche domains, premium domains, and bundled domain offerings. You understand naming structure, spelling friction, clarity, recall, intent matching, buyer fit, extension perception, liquidity factors, and the practical realities of buying, holding, developing, and reselling domain names.`,
  },
} as const;
