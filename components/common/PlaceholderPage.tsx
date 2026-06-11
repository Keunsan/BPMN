import { PlaceholderPageClient } from "@/components/common/PlaceholderPageClient";

type PlaceholderPageProps = {
  titleKey: string;
};

export const PlaceholderPage = ({ titleKey }: PlaceholderPageProps) => (
  <PlaceholderPageClient titleKey={titleKey} />
);
