// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Origens externas permitidas para `next/image` (otimização + Vercel).
   * Sem isto, URLs como https://outro-servidor.com/foto.jpg são recusadas em runtime.
   * @see https://nextjs.org/docs/app/api-reference/components/image#remotepatterns
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api-ca.alv-jamba.com",
        pathname: "/**",
      },
      /** App em produção na Vercel (e previews no mesmo projeto). */
      {
        protocol: "https",
        hostname: "ca-sigma-one.vercel.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.vercel.app",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);