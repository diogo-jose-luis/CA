import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "CA · Controle de Acesso", template: "%s · CA" },
  description:
    "Painel de gestão de controle de acesso para portarias de condomínios e portarias industriais.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning className={inter.variable}>
      <body className="app-root">{children}</body>
    </html>
  );
}
