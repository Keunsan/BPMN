import { PlaceholderPage } from "@/components/common/PlaceholderPage";

type ProcessDetailPageProps = {
  params: Promise<{ nodeId: string }>;
};

export default async function ProcessDetailPage({
  params,
}: ProcessDetailPageProps) {
  const { nodeId } = await params;

  return (
    <div className="p-6">
      <PlaceholderPage titleKey="menu.process" />
      <p className="mt-2 text-sm text-muted-foreground">ID: {nodeId}</p>
    </div>
  );
}
