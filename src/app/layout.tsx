import type { Metadata } from "next";
import { Onest, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "contract-agent",
  description: "Análise inteligente de contratos com comitê de Inteligências Artificiais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${onest.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
          style={{ backgroundColor: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
        >
          Pular para o conteúdo
        </a>
        <div className="flex min-h-screen">
          <Sidebar />
          <main id="main-content" className="flex-1 overflow-auto px-6 py-6 md:px-10">
            <div className="mx-auto max-w-4xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
