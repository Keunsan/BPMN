import { PlaceholderPage } from "@/components/common/PlaceholderPage";

type TaskAttributePageProps = {
  params: Promise<{ nodeId: string }>;
};

export default async function TaskAttributePage({
  params,
}: TaskAttributePageProps) {
  const { nodeId } = await params;

  return (
    <div className="p-6">
      <PlaceholderPage titleKey="menu.metadata" />
      <p className="mt-2 text-sm text-muted-foreground">Node: {nodeId}</p>
    </div>
  );
}
