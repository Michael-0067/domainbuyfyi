/**
 * Domain ingest pipeline — takes a plain domain name and produces a full Brief.
 * No SerpAPI, no Amazon. The domain name is the only input.
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db/prisma";
import { GURU } from "@/lib/guru";
import { NICHE } from "@/lib/config";
import { classifyProductCategory } from "./sections";
import type { Product } from "@/app/generated/prisma/client";
import type { GeneratedPageData } from "./sections";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL_SECTIONS = process.env.MODEL_STRUCTURED_EXTRACTION ?? "gpt-4o-mini";

function domainSlug(domain: string): string {
  return domain.toLowerCase().replace(/\./g, "-");
}

export async function ingestDomain(domain: string): Promise<Product> {
  const slug = domainSlug(domain);

  const existing = await db.product.findFirst({
    where: { slug, pageStatus: "complete" },
  });
  if (existing) return existing;

  const product = await db.product.upsert({
    where: { slug },
    create: {
      slug,
      productName: domain,
      canonicalSourceUrl: `https://${domain}`,
      normalizedAttributes: { features: [], specifications: {} },
      pageStatus: "generating",
    },
    update: { pageStatus: "generating" },
  });

  const [article, sections, category, imagePath] = await Promise.all([
    generateDomainArticle(domain),
    generateDomainSections(domain),
    classifyProductCategory(domain, [], null),
    generateDomainImage(domain, slug),
  ]);

  return db.product.update({
    where: { id: product.id },
    data: {
      briefContent: article,
      generatedPageData: sections as object,
      category,
      imageUrls: imagePath ? [imagePath] : [],
      pageStatus: "complete",
      lastGeneratedAt: new Date(),
    },
  });
}

async function generateDomainArticle(domain: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: GURU.model,
    messages: [
      {
        role: "system",
        content: `${GURU.systemPrompt}

You are writing a Domain Brief for ${NICHE.name}. You have only the domain name itself to work with. Analyse it as a naming asset: its structure, commercial potential, memorability, extension fit, likely buyer profile, and any relevant risks or weaknesses.

Formatting rules:
- Plain prose only. No markdown. No headers. No bullet points. No bold or italic.
- Write in clear, readable paragraphs.
- 350 to 450 words total.
- Do not start with "I" as the very first word.
- Do not end with a call to action or purchase recommendation.`,
      },
      {
        role: "user",
        content: `Prepare your Domain Brief for: ${domain}`,
      },
    ],
    temperature: 0.75,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}

async function generateDomainSections(domain: string): Promise<GeneratedPageData> {
  const [whatToKnow, keyFactsSummary] = await Promise.all([
    generateWhatToKnow(domain),
    generateKeyFacts(domain),
  ]);
  return {
    overview: "",
    keyFactsSummary,
    whatToKnow,
    reviewIntelligence: {
      commonPraise: [],
      commonComplaints: [],
      mixedObservations: [],
      overallPattern: "",
    },
  };
}

async function generateWhatToKnow(domain: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL_SECTIONS,
    messages: [
      {
        role: "system",
        content: `You write concise "what to know before you acquire" summaries for domain name listings on ${NICHE.name}.

Give the buyer 3–5 important things to understand before deciding to acquire this domain. Cover considerations like: extension suitability, spelling or recall risks, trademark potential conflicts, development vs. resale fit, and realistic use cases.

Format: Return each point as a plain sentence starting with a dash and a space:
- Consider X before proceeding.
- The domain may have Y implication.

No bold text. No markdown. No headers. Do not fabricate facts.`,
      },
      {
        role: "user",
        content: `Write a "what to know before you acquire" summary for the domain: ${domain}`,
      },
    ],
    temperature: 0.4,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}

async function generateKeyFacts(domain: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: MODEL_SECTIONS,
    messages: [
      {
        role: "system",
        content: `You summarise key commercial and naming characteristics of domain names for ${NICHE.name}.

Cover 3–5 of the most relevant factors: naming type (brandable, keyword, geo, etc.), industry or niche fit, potential buyer profile, extension reputation, and any notable strengths or weaknesses from a commercial naming perspective.

Format: Return each point as a plain sentence starting with a dash and a space:
- The domain is X type of name.
- It fits Y industry well.

No bold text. No markdown. No headers. Do not fabricate facts.`,
      },
      {
        role: "user",
        content: `Summarise the key commercial characteristics of the domain: ${domain}`,
      },
    ],
    temperature: 0.35,
  });
  return completion.choices[0].message.content?.trim() ?? "";
}

async function generateDomainImage(domain: string, slug: string): Promise<string | null> {
  try {
    // Interpret the domain into a landscape theme
    const themeCompletion = await openai.chat.completions.create({
      model: MODEL_SECTIONS,
      messages: [
        {
          role: "system",
          content: "You interpret domain names into short landscape painting themes. Output only a single evocative phrase describing a landscape scene — no explanations, no punctuation at the end. Example: 'a misty mountain valley at golden hour'",
        },
        { role: "user", content: `Domain: ${domain}` },
      ],
      temperature: 0.8,
    });
    const theme = themeCompletion.choices[0].message.content?.trim() ?? domain;

    // Generate the image
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: `An impressionist oil painting landscape: ${theme}. Soft expressive brushwork, warm atmospheric light, painterly texture, wide panoramic composition. No text, no people, no logos, no numbers, no signs, no words.`,
      size: "1792x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = imageResponse.data?.[0]?.url;
    if (!imageUrl) return null;

    // Download and resize
    const res = await fetch(imageUrl);
    const buffer = Buffer.from(await res.arrayBuffer());

    const sharp = (await import("sharp")).default;
    const dir = path.join(process.cwd(), "public", "domain-images");
    await fs.promises.mkdir(dir, { recursive: true });

    const filepath = path.join(dir, `${slug}.jpg`);
    await sharp(buffer)
      .resize(900, 506, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toFile(filepath);

    return `/domain-images/${slug}.jpg`;
  } catch (err) {
    console.error("[domain-image]", err);
    return null;
  }
}
