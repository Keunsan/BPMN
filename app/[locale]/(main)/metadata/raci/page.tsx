import { redirect } from "@/lib/i18n/navigation";

type RaciPageProps = {
  params: Promise<{ locale: string }>;
};

/** RACI 메뉴 진입 시 Task 속성 목록으로 이동 */
const RaciPage = async ({ params }: RaciPageProps) => {
  const { locale } = await params;
  redirect({ href: "/metadata/task-attribute", locale });
};

export default RaciPage;
