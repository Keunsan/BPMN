"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";

import { showErrorToast } from "@/components/common/ErrorToast";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/error-handler";
import { useRouter } from "@/lib/i18n/navigation";
import { useLogin } from "@/lib/query/hooks/useSession";

/** 로그인 버튼 — 세션 쿠키 발급 후 대시보드 이동 */
export const LoginForm = () => {
  const t = useTranslations();
  const router = useRouter();
  const loginMutation = useLogin();

  const handleLogin = () => {
    loginMutation.mutate(undefined, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          showErrorToast(error);
        }
      },
    });
  };

  return (
    <Button
      type="button"
      className="w-full"
      onClick={handleLogin}
      disabled={loginMutation.isPending}
    >
      <LogIn />
      {loginMutation.isPending ? t("common.loading") : t("menu.login")}
    </Button>
  );
};
