/**
 * Page section generator — structured content blocks from normalized product data.
 */

import OpenAI from "openai";
import type { NormalizedProduct } from "@/lib/normalize";
import type { SerpApiReviewInsight } from "@/lib/ingestion/serpapi";
import { SITE_CATEGORIES } from "@/lib/categories";
import type { SiteCategory } from "@/lib/categories";
import { NICHE } from "@/lib/config";

export { SITE_CATEGORIES } from "@/lib/categories";
export type { SiteCategory } from "@/lib/categories";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.MODEL_STRUCTURED_EXTRACTION ?? "gpt-4o-mini";

export async function classifyProductCategory(
  productName: string,
  features: string[],
  description: string | null,
): Promise<SiteCategory> {
  const context = [
    `Product: ${productName}`,
    description ? `Description: ${description}` : "",
    features.length > 0 ? `Key features: ${features.slice(0, 5).join("; ")}` : "",
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            `You are a ${NICHE.subject} product classifier. Choose the single best-fitting category from this list:\n\n` +
            SITE_CATEGORIES.map((c) => `- ${c}`).join("\n") + `\n\n` +
            `Rules:\n` +
            `- Respond with exactly one category name from the list above, copied exactly.\n` +
            `- Do NOT add any other words.\n` +
            `- When in doubt, commit to the closest match.`,
        },
        { role: "user", content: context },
      ],
      temperature: 0,
    });

    const result = completion.choices[0].message.content?.trim() ?? "";
    if ((SITE_CATEGORIES as readonly string[]).includes(result)) return result as SiteCategory;

    const fuzzy = (SITE_CATEGORIES as readonly string[]).find(
      (c) => c.toLowerCase().includes(result.toLowerCase()) || result.toLowerCase().includes(c.toLowerCase().split(" ")[0].toLowerCase())
    );
    return (fuzzy as SiteCategory) ?? "Other";
  } catch {
    return "Other";
  }
}

export interface GeneratedPageData {
  overview: string;
  keyFactsSummary: string;
  reviewIntelligence: ReviewIntelligence;
  whatToKnow: string;
  whyBuy?: string;
}

export interface ReviewIntelligence {
  commonPraise: string[];
  commonComplaints: string[];
  mixedObservations: string[];
  overallPattern: string;
}

function buildProductContext(product: NormalizedProduct): string {
  const { normalizedAttributes: attrs, reviewSummaryData: reviews } = product;

  const lines: string[] = [
    `Product: ${product.productName}`,
    product.brand ? `Brand: ${product.brand}` : "",
    product.category ? `Category: ${product.category}` : "",
    product.shortDescription ? `Description: ${product.shortDescription}` : "",
    "",
    "Key Features:",
    ...attrs.features.map((f) => `- ${f}`),
    "",
    "Specifications:",
    ...Object.entries(attrs.specifications).map(([k, v]) => `- ${k}: ${v}`),
  ];

  if (reviews.ratingsTotal) lines.push("", `Customer Reviews: ${reviews.ratingsTotal.toLocaleString()} ratings`);

  if (reviews.insights.length > 0) {
    lines.push("", "Review Insight Patterns:");
    reviews.insights.forEach((ins) => {
      const sent = ins.sentiment ? ` [${ins.sentiment}]` : "";
      lines.push(`- ${ins.title}${sent}: ${ins.summary}`);
      ins.snippets.slice(0, 2).forEach((s) => lines.push(`  • "${s}"`));
    });
  }

  if (reviews.reviews.length > 0) {
    lines.push("", "Sample Customer Reviews:");
    reviews.reviews.slice(0, 8).forEach((r) => {
      lines.push(`[${r.rating}/5] ${r.text.slice(0, 300)}`);
    });
  }

  return lines.filter((l) => l !== undefined).join("\n").trim();
}

export async function generatePageSections(product: NormalizedProduct): Promise<GeneratedPageData> {
  const context = buildProductContext(product);
  const [overview, keyFacts, reviewIntelligence, whatToKnow] = await Promise.all([
    generateOverview(context, product.productName),
    generateKeyFactsSummary(context, product.productName),
    generateReviewIntelligence(context, product.productName, product.reviewSummaryData.reviews, product.reviewSummaryData.insights),
    generateWhatToKnow(context, product.productName),
  ]);
  return { overview, keyFactsSummary: keyFacts, reviewIntelligence, whatToKnow };
}

async function generateOverview(context: string, productName: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You write neutral, factual product overviews for VacuumBuy.FYI, a vacuum product information platform.

Rules:
- Describe what the product is and what it is for
- Use plain, readable English
- Do not claim personal use, testing, or ownership
- Do not use hype language: no "best", "amazing", "must-have", "game-changing"
- Keep it to 2–3 short paragraphs
- Start with what the product is, not with its name`,
      },
      { role: "user", content: `Write a neutral product overview for: ${productName}\n\nProduct data:\n${context}` },
    ],
    temperature: 0.4,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}

async function generateKeyFactsSummary(context: string, productName: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You extract and summarize key product facts for VacuumBuy.FYI.

Write a brief summary of the most important facts covering: what it does, key physical characteristics, notable features, and standout specifications.

Format: Return each point as a plain sentence starting with a dash and a space:
- The product does X.
- It weighs Y and measures Z.

No bold text. No markdown. No headers. Plain sentences starting with a dash. 3–5 points maximum. Do not invent facts.`,
      },
      { role: "user", content: `Summarize the key facts for: ${productName}\n\nProduct data:\n${context}` },
    ],
    temperature: 0.3,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}

async function generateReviewIntelligence(
  context: string,
  productName: string,
  reviews: { rating: number; text: string }[],
  insights: SerpApiReviewInsight[] = []
): Promise<ReviewIntelligence> {
  if (reviews.length === 0 && insights.length === 0) {
    return {
      commonPraise: [],
      commonComplaints: [],
      mixedObservations: [],
      overallPattern: "Insufficient review data is available to identify patterns for this product.",
    };
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You analyze customer review patterns for VacuumBuy.FYI.

Respond in JSON format:
{
  "commonPraise": ["pattern 1", "pattern 2"],
  "commonComplaints": ["pattern 1", "pattern 2"],
  "mixedObservations": ["observation 1"],
  "overallPattern": "one sentence summary"
}

Rules:
- Describe patterns, not specific reviewer quotes
- Use phrasing like "Buyers frequently mention..."
- Maximum 4 items per array
- Do not fabricate patterns`,
      },
      { role: "user", content: `Analyze review patterns for: ${productName}\n\nProduct data:\n${context}` },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as Partial<ReviewIntelligence>;
    return {
      commonPraise: Array.isArray(parsed.commonPraise) ? parsed.commonPraise : [],
      commonComplaints: Array.isArray(parsed.commonComplaints) ? parsed.commonComplaints : [],
      mixedObservations: Array.isArray(parsed.mixedObservations) ? parsed.mixedObservations : [],
      overallPattern: parsed.overallPattern ?? "",
    };
  } catch {
    return { commonPraise: [], commonComplaints: [], mixedObservations: [], overallPattern: "" };
  }
}

async function generateWhatToKnow(context: string, productName: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You write concise "what to know before you buy" summaries for VacuumBuy.FYI.

Give the buyer 3–5 most important things to understand before making a decision. Not hype — the things that actually matter.

Format: Return each point as a plain sentence starting with a dash and a space:
- The product requires X.
- Consider Y before buying.

No bold text. No markdown. No headers.`,
      },
      { role: "user", content: `Write a "what to know before you buy" summary for: ${productName}\n\nProduct data:\n${context}` },
    ],
    temperature: 0.4,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}
