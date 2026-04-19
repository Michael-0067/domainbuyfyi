import type { Metadata } from "next";
import Breadcrumb from "@/app/components/Breadcrumb";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <h1 className="text-3xl font-bold pt-2" style={{ color: "var(--text)" }}>Privacy Policy</h1>
      <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        <p>{SITE_NAME} does not collect personal information from visitors. We do not require account creation or login to use any feature of this site.</p>
        <p>We use standard server logs that may include IP addresses and browser information. These logs are used solely for security and operational purposes and are not shared with third parties.</p>
        <p>This site contains affiliate links to Amazon. If you make a purchase through one of these links, we may earn a small commission at no additional cost to you. Amazon may use cookies or tracking as governed by their own privacy policy.</p>
        <p>We do not use analytics tracking, advertising pixels, or third-party data collection tools beyond the Amazon affiliate program.</p>
        <p>If you have any questions, please use the <a href="/contact" className="underline underline-offset-2" style={{ color: "var(--accent)" }}>contact page</a>.</p>
      </div>
    </div>
  );
}
