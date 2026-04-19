/**
 * Comparison title + slug generator.
 * Takes an array of product names and produces an SEO-friendly title and URL slug.
 */

import OpenAI from "openai";
import { GURU } from "@/lib/guru";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ComparisonMeta {
  title: string;
  slug: string;
}

export async function generateComparisonMeta(productNames: string[]): Promise<ComparisonMeta> {
  const list = productNames.map((n, i) => `${i + 1}. ${n}`).join("\n");

  const completion = await openai.chat.completions.create({
    model: GURU.model,
    messages: [
      {
        role: "system",
        content: `You generate SEO-friendly comparison page titles and URL slugs for VacuumBuy.FYI.

Given a list of vacuum product names, produce:
1. A concise, descriptive comparison title (50–80 characters ideal)
2. A URL slug derived from the title (lowercase, hyphens only, no special characters, max 80 chars)

Rules for the title:
- Include the key product identifiers or model names
- Include the word "vs" between products (use "vs" not "versus")
- End with "— Vacuum Comparison" or similar
- Do not use hype words: no "best", "ultimate", "top"

Rules for the slug:
- Lowercase letters, numbers, and hyphens only
- No special characters, no underscores
- Max 80 characters
- Should reflect the title naturally

Respond in JSON:
{
  "title": "...",
  "slug": "..."
}`,
      },
      { role: "user", content: `Products to compare:\n${list}` },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as Partial<ComparisonMeta>;
    const title = parsed.title?.trim() || productNames.join(" vs ");
    const slug = parsed.slug?.trim() || slugify(title);
    return { title, slug: slug.slice(0, 80) };
  } catch {
    const title = productNames.join(" vs ");
    return { title, slug: slugify(title).slice(0, 80) };
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a canonical dedup key from an array of product IDs.
 * Order-independent: [A,B,C] === [C,A,B] === [B,C,A]
 */
export function buildCanonicalKey(productIds: string[]): string {
  return [...productIds].sort().join("_vs_");
}
