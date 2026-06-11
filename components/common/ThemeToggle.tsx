"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** 다크/라이트 테마 전환 버튼 */
export function ThemeToggle() {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot,
  );

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("switchToLightMode") : t("switchToDarkMode");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
