"use client";

import dynamic from "next/dynamic";
import {
  Link2,
  Map,
  Maximize2,
  ClipboardList,
  Minus,
  Plus,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TaskAttributeForm } from "@/components/metadata/TaskAttributeForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLinkOrCreateBpmnTask } from "@/lib/query/hooks/useBpmn";
import type {
  BpmnElementLinkDto,
  BpmnElementType,
  BpmnModelDto,
} from "@/types/bpmn";

import type { BpmnEditorHandle } from "./BpmnEditorInner";
import { ProcessLinkModal, type ProcessLinkInfo } from "./ProcessLinkModal";

const BpmnEditorInner = dynamic(
  () => import("./BpmnEditorInner").then((m) => m.BpmnEditorInner),
  {
    ssr: false,
    loading: () => <LoadingSpinner className="h-full min-h-[480px]" />,
  },
);

type BpmnEditorProps = {
  model: BpmnModelDto;
  onSave: (payload: {
    bpmnXml: string;
    svgContent: string;
    elements: BpmnElementLinkDto[];
    createNewVersion?: boolean;
  }) => Promise<void>;
  saving?: boolean;
};

type TaskHoverState = {
  elementId: string;
  elementName: string | null;
  x: number;
  y: number;
};

/** BPMN 에디터 — 툴바 + 모델러 + 프로세스 연결 */
export const BpmnEditor = ({ model, onSave, saving }: BpmnEditorProps) => {
  const t = useTranslations("bpmn");
  const apiRef = useRef<BpmnEditorHandle | null>(null);
  const [links, setLinks] = useState<Record<string, ProcessLinkInfo>>(() =>
    buildLinksFromModel(model),
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [selectedElementName, setSelectedElementName] = useState<string | null>(
    null,
  );
  const [selectedElementType, setSelectedElementType] =
    useState<BpmnElementType | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [taskHover, setTaskHover] = useState<TaskHoverState | null>(null);
  const linkOrCreateMutation = useLinkOrCreateBpmnTask(model.modelId);

  const selectedLink = selectedElementId ? links[selectedElementId] : null;

  const openLinkModal = useCallback(() => {
    apiRef.current?.dismissInteraction();
    setLinkModalOpen(true);
  }, []);

  useEffect(() => {
    if (linkModalOpen) {
      apiRef.current?.dismissInteraction();
    }
  }, [linkModalOpen]);

  const handleSave = useCallback(
    async (createNewVersion = false) => {
      const result = await apiRef.current?.save();
      if (!result) {
        return;
      }

      await onSave({
        bpmnXml: result.xml,
        svgContent: result.svg,
        elements: result.elements,
        createNewVersion,
      });
      toast.success(t("saved"));
    },
    [onSave, t],
  );

  const handleLinkConfirm = (link: ProcessLinkInfo | null) => {
    if (!selectedElementId) {
      return;
    }

    setLinks((prev) => {
      const next = { ...prev };
      if (link) {
        next[selectedElementId] = link;
      } else {
        delete next[selectedElementId];
      }
      return next;
    });

    if (link) {
      apiRef.current?.updateElementName(selectedElementId, link.name);
      setSelectedElementName(link.name);
    } else {
      apiRef.current?.updateElementName(selectedElementId, "");
      setSelectedElementName(null);
    }
  };

  const handleCreateTaskMetadata = async () => {
    if (!selectedElementId || !selectedElementType) {
      return;
    }

    const link = await linkOrCreateMutation.mutateAsync({
      elementBpmnId: selectedElementId,
      elementType: selectedElementType,
      elementName: selectedElementName,
    });

    setLinks((prev) => ({
      ...prev,
      [selectedElementId]: {
        nodeId: link.nodeId,
        code: link.code,
        name: link.name,
      },
    }));
    apiRef.current?.updateElementName(selectedElementId, link.name);
    setSelectedElementName(link.name);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{model.modelName}</h1>
          <p className="text-xs text-muted-foreground">
            {model.processCode} · v{model.version}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => apiRef.current?.undo()}
          title={t("undo")}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => apiRef.current?.redo()}
          title={t("redo")}
        >
          <Redo2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => apiRef.current?.zoomOut()}
          title={t("zoomOut")}
        >
          <Minus className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => apiRef.current?.fitViewport()}
          title={t("fitViewport")}
        >
          <Maximize2 className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => apiRef.current?.toggleMinimap()}
          title={t("toggleMinimap")}
        >
          <Map className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => apiRef.current?.zoomIn()}
          title={t("zoomIn")}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedElementId}
          onClick={openLinkModal}
        >
          <Link2 className="mr-1 size-4" />
          {t("linkProcess")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedElementId}
          onClick={() => setMetadataOpen(true)}
        >
          <ClipboardList className="mr-1 size-4" />
          {t("taskMetadata")}
        </Button>
        <Button
          size="sm"
          disabled={saving}
          onClick={() => setSaveDialogOpen(true)}
        >
          <Save className="mr-1 size-4" />
          {saving ? t("saving") : t("save")}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <BpmnEditorInner
          modelId={model.modelId}
          xml={model.bpmnXml}
          links={links}
          interactionLocked={linkModalOpen}
          onReady={(api) => {
            apiRef.current = api;
          }}
          onSelectionChange={(id, name, type) => {
            setSelectedElementId(id);
            setSelectedElementName(name ?? null);
            setSelectedElementType(type ?? null);
          }}
          onTaskHoverChange={setTaskHover}
        />
      </div>

      {taskHover && (
        <div
          className="pointer-events-none fixed z-50 max-w-64 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
          style={{
            left: taskHover.x + 12,
            top: taskHover.y + 12,
          }}
        >
          <p className="font-medium">테스트 내용</p>
          <p className="mt-1 truncate text-muted-foreground">
            {taskHover.elementName ?? taskHover.elementId}
          </p>
        </div>
      )}

      <ProcessLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        elementName={selectedElementName}
        currentLink={selectedLink}
        onConfirm={handleLinkConfirm}
      />

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveChoiceTitle")}</DialogTitle>
            <DialogDescription>{t("saveChoiceDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setSaveDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setSaveDialogOpen(false);
                void handleSave(false);
              }}
            >
              {t("saveCurrentVersion")}
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                setSaveDialogOpen(false);
                void handleSave(true);
              }}
            >
              {t("saveAsNewVersion")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={metadataOpen} onOpenChange={setMetadataOpen}>
        <SheetContent className="w-[min(1920px,96vw)] overflow-y-auto sm:max-w-none">
          <SheetHeader>
            <SheetTitle>{t("taskMetadata")}</SheetTitle>
            <SheetDescription>
              {selectedElementName || selectedElementId
                ? t("taskMetadataDesc", {
                    name: selectedElementName ?? selectedElementId ?? "",
                  })
                : t("selectTaskFirst")}
            </SheetDescription>
          </SheetHeader>

          {!selectedElementId ? (
            <div className="px-4 text-sm text-muted-foreground">
              {t("selectTaskFirst")}
            </div>
          ) : selectedLink ? (
            <div className="space-y-3">
              <div className="mx-4 rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  {selectedLink.code} — {selectedLink.name}
                </p>
                <p className="text-muted-foreground">{t("linkedTaskDesc")}</p>
              </div>
              <TaskAttributeForm nodeId={selectedLink.nodeId} />
            </div>
          ) : (
            <div className="space-y-4 px-4">
              <div className="rounded-md border bg-muted/40 p-4">
                <p className="font-medium">{t("unlinkedTask")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("unlinkedTaskDesc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={!selectedElementType || linkOrCreateMutation.isPending}
                  onClick={() => void handleCreateTaskMetadata()}
                >
                  {linkOrCreateMutation.isPending
                    ? t("creatingTask")
                    : t("createTaskAndEditMetadata")}
                </Button>
                <Button type="button" variant="outline" onClick={openLinkModal}>
                  <Link2 className="mr-1 size-4" />
                  {t("linkExistingTask")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const buildLinksFromModel = (
  model: BpmnModelDto,
): Record<string, ProcessLinkInfo> => {
  const map: Record<string, ProcessLinkInfo> = {};

  for (const el of model.elements ?? []) {
    if (!el.linkedNodeId) {
      continue;
    }

    map[el.elementBpmnId] = {
      nodeId: el.linkedNodeId,
      code: el.linkedProcessCode ?? String(el.linkedNodeId),
      name: el.linkedProcessName ?? el.elementName ?? "",
    };
  }

  return map;
};
