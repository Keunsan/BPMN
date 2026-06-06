import { MainShell } from "@/components/common/MainShell";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MainShell>{children}</MainShell>;
}
