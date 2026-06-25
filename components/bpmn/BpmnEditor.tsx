"use client";

import dynamic from "next/dynamic";
import {
  ChevronLeft,
  Link2,
  Map as MapIcon,
  Maximize2,
  ClipboardList,
  Minus,
  Plus,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import type { PredecessorSelection } from "@/components/metadata/PredecessorSelect";
import {
  TaskAttributeForm,
  TaskAttributeSheetGuard,
  TaskAttributeSheetHeaderActions,
  TaskAttributeSheetProvider,
} from "@/components/metadata/TaskAttributeForm";
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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLinkOrCreateBpmnTask, useSyncBpmnPredecessors } from "@/lib/query/hooks/useBpmn";
import { prefetchTaskAttribute } from "@/lib/query/hooks/useMetadata";
import { useProcessDetail } from "@/lib/query/hooks/useProcess";
import { metadataKeys } from "@/lib/query/keys";
import { useNavigationGuardStore } from "@/lib/store/navigation-guard.store";
import {
  isProcessLinkCompatible,
  parseProcessLinkInfo,
} from "@/lib/utils/bpmn-link";
import { resolveBpmnPredecessorNodeIds } from "@/lib/utils/bpmn-auto-predecessor";
import { cn } from "@/lib/utils";
import type {
  BpmnElementLinkDto,
  BpmnElementType,
  BpmnModelDto,
  ProcessLinkInfo,
} from "@/types/bpmn";
import type { TaskAttributeDto } from "@/types/metadata";

import type { BpmnEditorHandle } from "./BpmnEditorInner";
import { ProcessLinkModal } from "./ProcessLinkModal";
import { ProcessLinkSidebar } from "./ProcessLinkSidebar";
import {
  BpmnDrilldownSheet,
  type DrilldownTarget,
} from "./BpmnDrilldownSheet";

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

const BPMN_LIST_PATH = "/bpmn";

/** BPMN 에디터 — 툴바 + 모델러 + 프로세스 연결 */
export const BpmnEditor = ({ model, onSave, saving }: BpmnEditorProps) => {
  const t = useTranslations("bpmn");
  const router = useGuardedRouter();
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
  const [diagramDirty, setDiagramDirty] = useState(false);
  const linkOrCreateMutation = useLinkOrCreateBpmnTask(model.modelId);
  const { mutateAsync: syncPredecessorsAsync } = useSyncBpmnPredecessors(
    model.modelId,
  );
  const queryClient = useQueryClient();
  const isE2eMode = model.modelKind === "E2E";
  const { data: ownerProcess } = useProcessDetail(model.nodeId ?? 0);
  const [drilldownTarget, setDrilldownTarget] = useState<DrilldownTarget | null>(
    null,
  );
  const [savedLinksJson, setSavedLinksJson] = useState(() =>
    JSON.stringify(buildLinksFromModel(model)),
  );
  const setBlocking = useNavigationGuardStore((s) => s.setBlocking);
  const setSaveBeforeLeave = useNavigationGuardStore((s) => s.setSaveBeforeLeave);
  const clearGuard = useNavigationGuardStore((s) => s.clearGuard);

  const linksDirty = JSON.stringify(links) !== savedLinksJson;
  const isDirty = diagramDirty || linksDirty;
  const [linkSidebarWidth, setLinkSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 288;
    }
    const saved = window.localStorage.getItem("pams-bpmn-link-sidebar-width");
    const parsed = saved ? Number(saved) : 288;
    return Number.isFinite(parsed)
      ? Math.min(480, Math.max(220, parsed))
      : 288;
  });
  const linkSidebarWidthRef = useRef(linkSidebarWidth);
  const sidebarResizeRef = useRef<{ startX: number; startW: number } | null>(
    null,
  );
  const [isResizingLinkSidebar, setIsResizingLinkSidebar] = useState(false);
  const [linkSidebarOpen, setLinkSidebarOpen] = useState(true);

  useEffect(() => {
    linkSidebarWidthRef.current = linkSidebarWidth;
  }, [linkSidebarWidth]);

  useEffect(() => {
    if (!isResizingLinkSidebar) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!sidebarResizeRef.current) {
        return;
      }
      const delta = event.clientX - sidebarResizeRef.current.startX;
      const next = Math.min(
        480,
        Math.max(220, sidebarResizeRef.current.startW + delta),
      );
      setLinkSidebarWidth(next);
    };

    const handlePointerUp = () => {
      sidebarResizeRef.current = null;
      setIsResizingLinkSidebar(false);
      window.localStorage.setItem(
        "pams-bpmn-link-sidebar-width",
        String(linkSidebarWidthRef.current),
      );
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };
  }, [isResizingLinkSidebar]);

  const [diagramXml, setDiagramXml] = useState(model.bpmnXml);
  const lastSyncedPredecessorKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setDiagramXml(model.bpmnXml);
  }, [model.bpmnXml]);

  useEffect(() => {
    if (!metadataOpen || !selectedElementId) {
      return;
    }

    const refreshDiagramXml = async () => {
      const snapshot = await apiRef.current?.getDiagramSnapshot();
      if (snapshot?.xml) {
        setDiagramXml(snapshot.xml);
      }
    };

    void refreshDiagramXml();
  }, [diagramDirty, links, metadataOpen, selectedElementId]);

  const selectedLink = selectedElementId ? links[selectedElementId] : null;

  const syncDiagramPredecessors = useCallback(async () => {
    const snapshot = await apiRef.current?.getDiagramSnapshot();
    if (!snapshot) {
      throw new Error("diagram snapshot unavailable");
    }

    await syncPredecessorsAsync({
      bpmnXml: snapshot.xml,
      elements: snapshot.elements,
    });

    void queryClient.invalidateQueries({ queryKey: metadataKeys.all });
  }, [queryClient, syncPredecessorsAsync]);

  const handleSyncFailure = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        showErrorToast(error);
        return;
      }
      toast.error(t("predecessorSyncFailed"));
    },
    [t],
  );
  const prefetchTaskAttributeForNode = useCallback(
    (id: number) => {
      prefetchTaskAttribute(queryClient, id);
    },
    [queryClient],
  );
  const cachedTaskAttribute = useMemo((): TaskAttributeDto | null | undefined => {
    if (selectedLink?.linkKind !== "L4_TASK") {
      return undefined;
    }

    return queryClient.getQueryData<TaskAttributeDto | null>(
      metadataKeys.taskAttribute(selectedLink.nodeId),
    );
  }, [queryClient, selectedLink, metadataOpen]);
  const autoPredecessors = useMemo((): PredecessorSelection[] => {
    if (!selectedLink || selectedLink.linkKind !== "L4_TASK") {
      return [];
    }

    return buildAutoPredecessorsFromDiagram(
      diagramXml,
      selectedLink.nodeId,
      links,
    );
  }, [diagramXml, links, selectedLink]);

  useEffect(() => {
    lastSyncedPredecessorKeyRef.current = null;
  }, [diagramXml, links]);

  useEffect(() => {
    if (!metadataOpen || selectedLink?.linkKind !== "L4_TASK") {
      return;
    }

    const syncKey = [
      selectedLink.nodeId,
      autoPredecessors
        .map((item) => item.predecessorNodeId)
        .sort((a, b) => a - b)
        .join(","),
    ].join(":");

    if (lastSyncedPredecessorKeyRef.current === syncKey) {
      return;
    }
    lastSyncedPredecessorKeyRef.current = syncKey;

    const persistPredecessors = async () => {
      try {
        const snapshot = await apiRef.current?.getDiagramSnapshot();
        if (!snapshot) {
          lastSyncedPredecessorKeyRef.current = null;
          return;
        }

        await syncPredecessorsAsync({
          bpmnXml: snapshot.xml,
          elements: snapshot.elements,
        });

        await queryClient.invalidateQueries({
          queryKey: metadataKeys.taskAttribute(selectedLink.nodeId),
        });
      } catch (error) {
        lastSyncedPredecessorKeyRef.current = null;
        handleSyncFailure(error);
      }
    };

    void persistPredecessors();
  }, [
    autoPredecessors,
    handleSyncFailure,
    metadataOpen,
    queryClient,
    selectedLink,
    syncPredecessorsAsync,
  ]);

  useEffect(() => {
    if (selectedLink?.linkKind === "L4_TASK") {
      prefetchTaskAttributeForNode(selectedLink.nodeId);
    }
  }, [prefetchTaskAttributeForNode, selectedLink]);

  const openMetadataSheet = useCallback(() => {
    if (selectedLink?.linkKind === "L4_TASK") {
      prefetchTaskAttributeForNode(selectedLink.nodeId);
    }
    setMetadataOpen(true);
  }, [prefetchTaskAttributeForNode, selectedLink]);

  const openLinkModal = useCallback(() => {
    apiRef.current?.dismissInteraction();
    setLinkModalOpen(true);
  }, []);

  useEffect(() => {
    if (linkModalOpen) {
      apiRef.current?.dismissInteraction();
    }
  }, [linkModalOpen]);

  useEffect(() => {
    if (metadataOpen) {
      apiRef.current?.dismissInteraction();
    }
  }, [metadataOpen]);

  useEffect(() => {
    if (!metadataOpen || !selectedElementId) {
      return;
    }

    const revealSelectedTask = () => {
      const sheet = document.querySelector<HTMLElement>(
        "[data-pams-task-metadata-sheet='true']",
      );
      const overlayLeft = sheet?.getBoundingClientRect().left;

      if (overlayLeft === undefined) {
        return;
      }

      apiRef.current?.revealElementLeftOfOverlay(
        selectedElementId,
        overlayLeft,
      );
    };

    const frameId = requestAnimationFrame(revealSelectedTask);
    const timeoutId = window.setTimeout(revealSelectedTask, 220);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [metadataOpen, selectedElementId]);

  const handleSave = useCallback(
    async (createNewVersion = false): Promise<boolean> => {
      const result = await apiRef.current?.save();
      if (!result) {
        return false;
      }

      try {
        await onSave({
          bpmnXml: result.xml,
          svgContent: result.svg,
          elements: result.elements,
          createNewVersion,
        });

        if (!isE2eMode) {
          await syncPredecessorsAsync({
            bpmnXml: result.xml,
            elements: result.elements,
          });
        }

        setSavedLinksJson(JSON.stringify(links));
        setDiagramDirty(false);
        for (const link of Object.values(links)) {
          if (link.linkKind === "L4_TASK") {
            void queryClient.invalidateQueries({
              queryKey: metadataKeys.taskAttribute(link.nodeId),
            });
          }
        }
        void queryClient.invalidateQueries({ queryKey: metadataKeys.all });
        toast.success(t("saved"));
        return true;
      } catch (error) {
        if (error instanceof ApiError) {
          showErrorToast(error);
        } else {
          toast.error(t("saveFailed"));
        }
        return false;
      }
    },
    [isE2eMode, links, onSave, queryClient, syncPredecessorsAsync, t],
  );

  useEffect(() => {
    setBlocking(isDirty);
  }, [isDirty, setBlocking]);

  useEffect(() => {
    setSaveBeforeLeave(async () => handleSave(false));
  }, [handleSave, setSaveBeforeLeave]);

  useEffect(() => {
    return () => {
      clearGuard();
    };
  }, [clearGuard]);

  const linkElementToProcess = useCallback(
    (
      elementId: string,
      link: ProcessLinkInfo | null,
      elementType?: BpmnElementType | null,
    ) => {
      const type = elementType ?? selectedElementType;
      if (link && !isProcessLinkCompatible(type, link)) {
        toast.error(t("linkIncompatible"));
        return;
      }

      const previousNodeId = links[elementId]?.nodeId;

      setLinks((prev) => {
        const next = { ...prev };
        if (link) {
          next[elementId] = link;
        } else {
          delete next[elementId];
        }
        return next;
      });

      if (previousNodeId) {
        void queryClient.invalidateQueries({
          queryKey: metadataKeys.taskAttribute(previousNodeId),
        });
      }

      if (link) {
        apiRef.current?.updateElementName(elementId, link.name);
        if (elementId === selectedElementId) {
          setSelectedElementName(link.name);
        }
        if (link.linkKind === "L4_TASK") {
          prefetchTaskAttributeForNode(link.nodeId);
          void queryClient.invalidateQueries({
            queryKey: metadataKeys.taskAttribute(link.nodeId),
          });
        }
        toast.success(t("linkSuccess"));
      } else {
        apiRef.current?.updateElementName(elementId, "");
        if (elementId === selectedElementId) {
          setSelectedElementName(null);
        }
      }
    },
    [
      links,
      prefetchTaskAttributeForNode,
      queryClient,
      selectedElementId,
      selectedElementType,
      t,
    ],
  );

  const handleLinkConfirm = (link: ProcessLinkInfo | null) => {
    if (!selectedElementId) {
      return;
    }
    linkElementToProcess(selectedElementId, link);
  };

  const handleProcessLinkDrop = useCallback(
    (
      elementId: string,
      link: ProcessLinkInfo,
      elementType: BpmnElementType | null,
    ) => {
      linkElementToProcess(elementId, link, elementType);
      setSelectedElementId(elementId);
      setSelectedElementName(link.name);
      setSelectedElementType(elementType);
    },
    [linkElementToProcess],
  );

  const handleElementReplaced = useCallback((oldId: string, newId: string) => {
    if (oldId === newId) {
      return;
    }

    setLinks((prev) => {
      const link = prev[oldId];
      if (!link) {
        return prev;
      }

      const next = { ...prev };
      delete next[oldId];
      next[newId] = link;
      return next;
    });
  }, []);

  const handleSidebarResizePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    sidebarResizeRef.current = {
      startX: event.clientX,
      startW: linkSidebarWidthRef.current,
    };
    setIsResizingLinkSidebar(true);
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
        level: "L4",
        linkKind: "L4_TASK",
      },
    }));
    apiRef.current?.updateElementName(selectedElementId, link.name);
    setSelectedElementName(link.name);
    prefetchTaskAttributeForNode(link.nodeId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => router.push(BPMN_LIST_PATH)}
          title={t("backToList")}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{t("backToList")}</span>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h1 className="truncate text-lg font-semibold">{model.modelName}</h1>
          <p className="shrink-0 text-right text-xs text-muted-foreground">
            {isE2eMode
              ? `${model.e2eProcessCode ?? "E2E"} · v${model.version}`
              : `${model.processCode} · v${model.version}`}
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
          <MapIcon className="size-4" />
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
          disabled={!selectedElementId || isE2eMode}
          onClick={openMetadataSheet}
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

      <div className="flex min-h-0 flex-1">
        <ProcessLinkSidebar
          parentNodeId={model.nodeId ?? 0}
          parentCode={isE2eMode ? model.e2eProcessCode : model.processCode}
          parentName={isE2eMode ? model.e2eProcessName : model.processName}
          companyCode={ownerProcess?.companyCode}
          businessUnitCode={ownerProcess?.businessUnitCode}
          e2eMode={isE2eMode}
          selectedElementType={selectedElementType}
          links={links}
          selectedElementId={selectedElementId}
          selectedElementName={selectedElementName}
          onLinkToSelected={(link) => handleLinkConfirm(link)}
          open={linkSidebarOpen}
          onOpenChange={setLinkSidebarOpen}
          width={linkSidebarWidth}
        />
        {linkSidebarOpen && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("linkPanelResize")}
          aria-valuenow={linkSidebarWidth}
          aria-valuemin={220}
          aria-valuemax={480}
          className={cn(
            "relative z-20 flex w-2 shrink-0 cursor-col-resize touch-none select-none items-center justify-center border-r bg-muted/40 transition-colors hover:bg-primary/15 active:bg-primary/25",
            isResizingLinkSidebar && "bg-primary/25",
          )}
          onPointerDown={handleSidebarResizePointerDown}
        >
          <div className="pointer-events-none h-10 w-0.5 rounded-full bg-border" />
        </div>
        )}
        <div className="min-h-0 min-w-0 flex-1">
          <BpmnEditorInner
            modelId={model.modelId}
            xml={model.bpmnXml}
            links={links}
            interactionLocked={linkModalOpen || metadataOpen}
            onReady={(api) => {
              apiRef.current = api;
            }}
            onSelectionChange={(id, name, type) => {
              setSelectedElementId(id);
              setSelectedElementName(name ?? null);
              setSelectedElementType(type ?? null);
            }}
            onTaskHoverChange={setTaskHover}
            onProcessLinkDrop={handleProcessLinkDrop}
            onElementReplaced={handleElementReplaced}
            onCallActivityDblClick={(link) =>
              setDrilldownTarget({
                l3NodeId: link.nodeId,
                l3Code: link.code,
                l3Name: link.name,
                parentLabel: isE2eMode
                  ? (model.e2eProcessCode ?? model.modelName)
                  : model.processCode,
              })
            }
            onDirtyChange={setDiagramDirty}
          />
        </div>
      </div>

      <BpmnDrilldownSheet
        target={drilldownTarget}
        onClose={() => setDrilldownTarget(null)}
      />

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
        elementType={selectedElementType}
        ownerNodeId={model.nodeId ?? 0}
        e2eMode={isE2eMode}
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

      <TaskAttributeSheetProvider onClose={() => setMetadataOpen(false)}>
        <TaskAttributeSheetGuard
          open={metadataOpen}
          onOpenChange={setMetadataOpen}
        >
          <SheetContent
            data-pams-task-metadata-sheet="true"
            className="flex h-full !w-[min(768px,96vw)] !max-w-none flex-col gap-0 overflow-hidden p-0 sm:!max-w-none"
            showCloseButton={false}
          >
            <SheetHeader className="shrink-0 gap-1 border-b px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <SheetTitle className="min-w-0 flex-1 truncate text-base font-semibold">
                  {selectedLink?.linkKind === "L4_TASK"
                    ? `${selectedLink.code} — ${selectedLink.name}`
                    : t("taskMetadata")}
                </SheetTitle>
                {selectedLink?.linkKind === "L4_TASK" ? (
                  <TaskAttributeSheetHeaderActions />
                ) : null}
              </div>
              <SheetDescription className="line-clamp-2">
                {selectedElementName || selectedElementId
                  ? t("taskMetadataDesc", {
                      name: selectedElementName ?? selectedElementId ?? "",
                    })
                  : t("selectTaskFirst")}
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
              {!selectedElementId ? (
                <div className="text-sm text-muted-foreground">
                  {t("selectTaskFirst")}
                </div>
              ) : selectedLink?.linkKind === "L4_TASK" ? (
                <TaskAttributeForm
                  key={selectedLink.nodeId}
                  nodeId={selectedLink.nodeId}
                  autoPredecessors={autoPredecessors}
                  syncBpmnPredecessors={
                    isE2eMode ? undefined : syncDiagramPredecessors
                  }
                  variant="sheet"
                  attributePlaceholder={cachedTaskAttribute ?? undefined}
                />
              ) : selectedLink?.linkKind === "L3_CALL" ? (
                <div className="space-y-3 rounded-md border bg-muted/40 p-4 text-sm">
                  <p className="font-medium">
                    {selectedLink.code} — {selectedLink.name}
                  </p>
                  <p className="text-muted-foreground">
                    {t("linkedCallActivityDesc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
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
            </div>
          </SheetContent>
        </TaskAttributeSheetGuard>
      </TaskAttributeSheetProvider>
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

    map[el.elementBpmnId] = parseProcessLinkInfo(
      el.linkedNodeId,
      el.linkedProcessCode ?? String(el.linkedNodeId),
      el.linkedProcessName ?? el.elementName ?? "",
      el.elementType,
      el.properties,
    );
  }

  return map;
};

/** 다이어그램·연결 정보에서 BPMN 선행 프로세스 선택 목록을 만든다 */
const buildAutoPredecessorsFromDiagram = (
  bpmnXml: string | null,
  nodeId: number,
  links: Record<string, ProcessLinkInfo>,
): PredecessorSelection[] => {
  const predecessorNodeIds = resolveBpmnPredecessorNodeIds(
    bpmnXml,
    nodeId,
    links,
  );
  const linkByNodeId = new Map(
    Object.values(links).map((link) => [link.nodeId, link]),
  );

  return predecessorNodeIds.flatMap((predecessorNodeId) => {
    const link = linkByNodeId.get(predecessorNodeId);
    if (!link) {
      return [];
    }

    return [
      {
        predecessorNodeId,
        predecessorCode: link.code,
        predecessorName: link.name,
        predecessorLevel: link.level,
        conditionDesc: null,
        isMandatory: true,
        isBpmnDerived: true,
      },
    ];
  });
};
