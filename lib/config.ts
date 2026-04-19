/**
 * NICHE CONFIG — the single file to edit when personalising this template for a new site.
 * All niche-specific values live here. The rest of the codebase reads from this file.
 */

export const NICHE = {
  // ── Site identity ──────────────────────────────────────────────────────────
  name: "Vacuum Buy FYI",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vacuumbuy.fyi")
    .replace(/^https:\/\/www\./, "https://"),

  // ── Product niche ──────────────────────────────────────────────────────────
  subject: "vacuum",                              // singular noun, lowercase
  subjectPlural: "vacuums",                       // plural noun, lowercase
  subjectLabel: "Vacuum",                         // title-case label for headings, e.g. "Vacuum Briefs"
  productDescription: "vacuums and floor care equipment",

  // ── Product categories ─────────────────────────────────────────────────────
  // Used for browse filters and AI classification. "Other" must always be last.
  // Keep these high-level — 6 to 10 categories works best.
  categories: [
    "Robot Vacuums",
    "Upright Vacuums",
    "Canister Vacuums",
    "Stick Vacuums",
    "Handheld Vacuums",
    "Wet-Dry Vacuums",
    "Central Vacuum Systems",
    "Backpack Vacuums",
    "Vacuum Accessories",
    "Other",
  ] as const satisfies readonly string[],

  // ── Contact ────────────────────────────────────────────────────────────────
  contactEmail: "hello@vacuumbuy.fyi",

  // ── Affiliate ──────────────────────────────────────────────────────────────
  affiliateTag: "vacuumbuyfyi-20",

  // ── Accent colors ──────────────────────────────────────────────────────────
  // These are injected as CSS variables at runtime and override globals.css.
  accent:      "#1f3a5f",
  accentLight: "#e8eef6",
  accentHover: "#162d4a",

  // ── Homepage hero ──────────────────────────────────────────────────────────
  heroLine1:      "Vacuum intelligence,",
  heroLine2:      "before you buy.",
  heroSubtext:    "Informed Briefs on vacuums and floor care equipment — structured, analytical, and free of hype. Compare side by side. Read the roundups. Buy with clarity.",
  heroCtaPrimary: "Compare Vacuums →",

  // ── Footer ─────────────────────────────────────────────────────────────────
  footerTagline:           "Vacuum Buy FYI provides structured vacuum product analysis based on publicly available data.",
  footerCrossPromoIntro:   "Looking beyond vacuums?",
  footerCrossPromoLink:    "For broader product roundups, visit Smart Buy FYI",
  footerCrossPromoUrl:     "https://smartbuy.fyi",

  // ── AI Analyst persona ─────────────────────────────────────────────────────
  guru: {
    name:   "Buying Analyst",
    slug:   "buying-analyst",
    model:  process.env.MODEL_GURU_ARTICLE ?? "gpt-5.4-mini",
    systemPrompt: `You are the Buying Analyst, a vacuum cleaner specialist and product analyst with years of experience researching floor care technology across every price tier and use case.

Your approach is methodical and evidence-based. You study specifications, parse engineering tradeoffs, and translate technical details into clear purchasing intelligence. You are not impressed by marketing language. You care about what actually works, for whom, and under what conditions.

You write for buyers who want to understand what they are getting before they spend money — not to be sold something. Your voice is direct, organized, and precise. You surface weaknesses and uncertainties without hesitation. You do not hype.

Your focus: robot vacuums, upright vacuums, canister vacuums, stick vacuums, handheld vacuums, wet-dry vacs, and all related floor care equipment. You understand filtration systems, motor types, suction measurement, battery performance, dustbin design, brush roll technology, and the practical realities of owning and maintaining cleaning equipment.`,
  },
} as const;
