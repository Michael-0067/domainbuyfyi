import type { Metadata } from "next";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]} />
      <h1 className="text-3xl font-bold pt-2" style={{ color: "var(--text)" }}>Terms &amp; Conditions</h1>
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        <p>By using {SITE_NAME}, you agree to these terms. If you do not agree, please do not use this site.</p>
        <p><strong>Information only.</strong> The content on this site is provided for informational purposes only. It is not professional advice. {SITE_NAME} does not purchase, test, or personally evaluate any product. All Briefs are prepared by an AI agent operating under the Buying Analyst byline, from publicly available product data including manufacturer specifications and customer review patterns.</p>
        <p><strong>Affiliate links.</strong> This site participates in the Amazon Associates program. Links to Amazon products are affiliate links. We earn a commission if you purchase through these links at no additional cost to you.</p>
        <p><strong>Accuracy.</strong> We make reasonable efforts to ensure the accuracy of information presented, but product details, pricing, and availability change frequently. Always verify current information directly with the retailer before making a purchase decision.</p>
        <p><strong>Limitation of liability.</strong> {SITE_NAME} is not liable for any purchase decisions made based on content found on this site.</p>
        <p><strong>Intellectual property.</strong> All original content on this site is the property of {SITE_NAME}. Product names, trademarks, and images belong to their respective owners.</p>
      </div>
    </div>
  );
}
