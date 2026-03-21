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
      // Exemplo — duplica o bloco e altera `hostname` (e `pathname` se precisares restringir):
      {
         protocol: "https",
         hostname: "api-ca.alv-jamba.com",
         pathname: "/**",
       },
    ],
  },
};

export default withNextIntl(nextConfig);