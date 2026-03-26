// src/app/[locale]/layout.tsx

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

import Providers from "../providers";

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "CA · Controle de Acesso", template: "%s · CA" },
  description:
    "Painel de gestão de controle de acesso para portarias de condomínios e portarias industriais.",
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg" },
    ],
    shortcut: ["/logo.jpg"],
    apple: [{ url: "/logo.jpg" }],
  },
};

/** Permite `env(safe-area-inset-*)` em tablets / PWA com entalhes. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // ⭐ CORREÇÃO AQUI
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body className="app-root">
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}