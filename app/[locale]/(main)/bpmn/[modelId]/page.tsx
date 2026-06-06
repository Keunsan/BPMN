import { PlaceholderPage } from "@/components/common/PlaceholderPage";

type BpmnEditorPageProps = {
  params: Promise<{ modelId: string }>;
};

export default async function BpmnEditorPage({ params }: BpmnEditorPageProps) {
  const { modelId } = await params;

  return (
    <div className="p-6">
      <PlaceholderPage titleKey="menu.bpmn" />
      <p className="mt-2 text-sm text-muted-foreground">Model: {modelId}</p>
    </div>
  );
}
