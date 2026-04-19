/**
 * Product Brief generator — written in the Guru's voice.
 */

import OpenAI from "openai";
import { GURU } from "@/lib/guru";
import type { NormalizedProduct } from "@/lib/normalize";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildProductContext(product: NormalizedProduct): string {
  const { normalizedAttributes: attrs, reviewSummaryData: reviews } = product;

  const lines: string[] = [
    `Product: ${product.productName}`,
    product.brand ? `Brand: ${product.brand}` : "",
    product.category ? `Category: ${product.category}` : "",
    product.shortDescription ? `Description: ${product.shortDescription}` : "",
    "",
    "Listed Features:",
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
    lines.push("", "Sample Review Excerpts:");
    reviews.reviews.slice(0, 10).forEach((r) => {
      lines.push(`[${r.rating}/5] ${r.text.slice(0, 300)}`);
    });
  }

  return lines.filter(Boolean).join("\n").trim();
}

export async function generateProductArticle(product: NormalizedProduct): Promise<string> {
  const context = buildProductContext(product);

  const completion = await openai.chat.completions.create({
    model: GURU.model,
    messages: [
      {
        role: "system",
        content: `${GURU.systemPrompt}

You are writing a Product Brief for VacuumBuy.FYI. You have been given structured data about a product — specifications, listed features, and a sample of customer review content. You did not buy this product. You are not claiming to own it or have tested it. You are writing from the product data.

Write as yourself. Your voice, your priorities, your way of looking at things. Make it readable and engaging — this is a proper piece, not a list.

Formatting rules:
- Plain prose only. No markdown. No headers. No bullet points. No bold or italic.
- Write in clear, readable paragraphs.
- 400 to 500 words total.
- Do not repeat the product name excessively.
- Do not start with "I" as the very first word.
- Do not end with a call to action or purchase recommendation.`,
      },
      { role: "user", content: `Prepare your Brief on this product.\n\n${context}` },
    ],
    temperature: 0.75,
  });

  return completion.choices[0].message.content?.trim() ?? "";
}
