import type { PlaceholderPageIconKey } from "@/components/common/placeholder-page-icons";
import { PlaceholderPageClient } from "@/components/common/PlaceholderPageClient";

type PlaceholderPageProps = {
  titleKey: string;
  iconKey: PlaceholderPageIconKey;
  emptyTitle: string;
  emptyDescription: string;
};

export const PlaceholderPage = ({
  titleKey,
  iconKey,
  emptyTitle,
  emptyDescription,
}: PlaceholderPageProps) => (
  <PlaceholderPageClient
    titleKey={titleKey}
    iconKey={iconKey}
    emptyTitle={emptyTitle}
    emptyDescription={emptyDescription}
  />
);
