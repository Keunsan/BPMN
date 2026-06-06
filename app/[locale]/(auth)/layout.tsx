import { LanguageSelector } from "@/components/common/LanguageSelector";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-end border-b px-6 py-3">
        <LanguageSelector />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
