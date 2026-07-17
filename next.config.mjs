import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "s3.philand.io.vn" },
    ],
  },
  async redirects() {
    // In the Next.js App Router, route groups like "(dashboard)" are
    // *invisible* in URLs — the real path is /<locale>/sharing/<id>.
    // Some old bookmarks / shared links still contain the literal
    // "(dashboard)" segment from a previous redirect bug; rewrite
    // them so users don't hit a 404.
    return [
      {
        source: "/:locale(en|vi)/(dashboard)/sharing/:budgetId",
        destination: "/:locale/sharing/:budgetId",
        permanent: false,
      },
      {
        source: "/:locale(en|vi)/(dashboard)/budgets/:budgetId",
        destination: "/:locale/budgets/:budgetId",
        permanent: false,
      },
      {
        source: "/:locale(en|vi)/(dashboard)/:path*",
        destination: "/:locale/:path*",
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
