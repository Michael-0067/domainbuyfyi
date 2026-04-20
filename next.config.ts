import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-fe.ssl-images-amazon.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // www → canonical (301)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.domainbuy.fyi" }],
        destination: "https://domainbuy.fyi/:path*",
        permanent: true,
      },
      // Legacy product URLs
      {
        source: "/product/:slug",
        destination: "/briefs/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
