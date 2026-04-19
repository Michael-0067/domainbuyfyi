/**
 * Roundup generation — card summaries (structured model) + narrative (guru voice).
 */

import OpenAI from "openai";
import { GURU } from "@/lib/guru";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_CARDS = process.env.MODEL_STRUCTURED_EXTRACTION ?? "gpt-4o-mini";

export async function generateRoundupSummary(productName: string, briefArticle: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL_CARDS,
    messages: [
      {
        role: "system",
        content: `You write roundup card summaries for VacuumBuy.FYI, a neutral vacuum product information platform.

You will be given a full Product Brief. Produce a compact intelligence note for a roundup page.

Rules:
- Base your summary only on the provided Brief — do not invent facts
- Do NOT copy or closely paraphrase sentences from the Brief
- Do NOT use review language: no "best", "top", "winner", "our pick", "must-buy"
- Do NOT claim personal testing or ownership
- Write in a calm, analytical, non-salesy tone
- Cover where supported: what the product is, what stands out, what kind of buyer or use case it may fit, and any notable tradeoff
- Keep it to roughly 250–300 words
- Output plain text only — no markdown, no bullet points, no headers`,
      },
      { role: "user", content: `Write a roundup card summary for: ${productName}\n\nFull Brief:\n${briefArticle}` },
    ],
    temperature: 0.4,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}

export interface RoundupNarrative {
  introText: string;
  closingText: string;
}

export async function generateRoundupNarrative(
  workingTitle: string,
  items: { productName: string; summary: string }[],
): Promise<RoundupNarrative> {
  const cardBlock = items.map((item, i) => `Card ${i + 1}: ${item.productName}\n${item.summary}`).join("\n\n---\n\n");

  const completion = await openai.chat.completions.create({
    model: GURU.model,
    messages: [
      {
        role: "system",
        content: `${GURU.systemPrompt}

You write roundup page narrative copy for VacuumBuy.FYI — a neutral, intelligence-first vacuum product information platform.

You will be given a working title and a set of roundup card summaries. Produce:
1. A concise introduction paragraph
2. A concise closing paragraph

Tone rules (non-negotiable):
- Neutral and analytical — no hype, no enthusiasm, no sales energy
- No "best", "top", "winner", "our pick", "must-buy", "reviewed", "hands-on"
- No language implying personal testing, ownership, or endorsement
- Write as a structured intelligence resource, not a listicle

Introduction rules:
- 3–4 sentences
- Do NOT open with "This roundup..." — lead with the category question or decision context
- Frame it as product intelligence: what does a buyer need to understand before choosing?
- Give it editorial weight

Closing rules:
- 2–3 sentences
- Reflect on what the comparison surfaced across the set
- Remind the reader that the full Briefs contain the detail needed to compare further
- Do NOT say "below" or imply content follows — this paragraph is the last thing on the page
- Do not name individual products as winners

Respond in JSON:
{
  "introText": "...",
  "closingText": "..."
}`,
      },
      { role: "user", content: `Working title: "${workingTitle}"\n\nCard summaries:\n\n${cardBlock}` },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}") as Partial<RoundupNarrative>;
    return {
      introText: parsed.introText?.trim() || "",
      closingText: parsed.closingText?.trim() || "",
    };
  } catch {
    return { introText: "", closingText: "" };
  }
}
