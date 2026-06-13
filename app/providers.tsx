"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { setApiClientLocale } from "@/lib/api/client";
import type { Locale } from "@/lib/i18n/config";
import { getQueryClient } from "@/lib/query/client";
import { useUIStore } from "@/lib/store/ui.store";

type ProvidersProps = {
  locale: Locale;
  children: React.ReactNode;
};

function LocaleSync({ locale }: { locale: Locale }) {
  const setCurrentLocale = useUIStore((s) => s.setCurrentLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    setCurrentLocale(locale);
    setApiClientLocale(() => useUIStore.getState().currentLocale);
  }, [locale, setCurrentLocale]);

  return null;
}

export function Providers({ locale, children }: ProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <NuqsAdapter>
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <LocaleSync locale={locale} />
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
