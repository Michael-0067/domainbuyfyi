import type { Metadata } from "next";
import Breadcrumb from "@/app/components/Breadcrumb";
import { NICHE } from "@/lib/config";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with questions, product suggestions, or corrections.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="space-y-8 max-w-xl">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>Contact</h1>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Have a question, a product suggestion, or noticed an error? We&apos;d like to hear from you.
        </p>
      </div>
      <div
        className="rounded-xl p-6 space-y-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Send us an email at:
        </p>
        <p className="text-base font-semibold" style={{ color: "var(--accent)" }}>
          {NICHE.contactEmail}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          We aim to respond within 2 business days.
        </p>
      </div>
    </div>
  );
}
