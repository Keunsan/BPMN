"use client";

import dynamic from "next/dynamic";
import {
  ExternalLink,
  Link2,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/i18n/navigation";
import type { BpmnElementLinkDto, BpmnModelDto } from "@/types/bpmn";

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

/** BPMN 에디터 — 툴바 + 모델러 + 프로세스 연결 */
export const BpmnEditor = ({ model, onSave, saving }: BpmnEditorProps) => {
  const t = useTranslations("bpmn");
  const router = useRouter();
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
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const selectedLink = selectedElementId ? links[selectedElementId] : null;

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
  };

  const navigateToProcess = () => {
    if (selectedLink) {
      router.push(`/process/${selectedLink.nodeId}`);
    }
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
          onClick={() => apiRef.current?.zoomIn()}
          title={t("zoomIn")}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedElementId}
          onClick={() => setLinkModalOpen(true)}
        >
          <Link2 className="mr-1 size-4" />
          {t("linkProcess")}
        </Button>
        {selectedLink && (
          <Button variant="outline" size="sm" onClick={navigateToProcess}>
            <ExternalLink className="mr-1 size-4" />
            {selectedLink.code}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => handleSave(true)}
        >
          {t("saveNewVersion")}
        </Button>
        <Button size="sm" disabled={saving} onClick={() => handleSave(false)}>
          <Save className="mr-1 size-4" />
          {saving ? t("saving") : t("save")}
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <BpmnEditorInner
          xml={model.bpmnXml}
          links={links}
          onReady={(api) => {
            apiRef.current = api;
          }}
          onSelectionChange={(id, name) => {
            setSelectedElementId(id);
            setSelectedElementName(name ?? null);
          }}
        />
      </div>

      <ProcessLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        elementName={selectedElementName}
        currentLink={selectedLink}
        onConfirm={handleLinkConfirm}
      />
    </div>
  );
};

const buildLinksFromModel = (
  model: BpmnModelDto,
): Record<string, ProcessLinkInfo> => {
  const map: Record<string, ProcessLinkInfo> = {};

  for (const el of model.elements ?? []) {
    if (el.linkedNodeId && el.linkedProcessCode && el.linkedProcessName) {
      map[el.elementBpmnId] = {
        nodeId: el.linkedNodeId,
        code: el.linkedProcessCode,
        name: el.linkedProcessName,
      };
    }
  }

  return map;
};
