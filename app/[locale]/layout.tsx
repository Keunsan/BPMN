import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/providers";
import { routing } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  // #region agent log
  fetch("http://127.0.0.1:7372/ingest/b5d4eb1c-b11c-4de9-b817-328c9c6effff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7d9a43",
    },
    body: JSON.stringify({
      sessionId: "7d9a43",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "app/[locale]/layout.tsx:LocaleLayout",
      message: "Locale layout render",
      data: { locale, hasHtmlBodyTags: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full min-h-0 antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers locale={locale as Locale}>
            {children}
          </Providers>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
