"use client";

import { ChevronDown, ChevronRight, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  MultiLangInput,
  type MultiLangTextValue,
} from "@/components/common/MultiLangInput";
import {
  PredecessorSelect,
  type PredecessorSelection,
} from "@/components/metadata/PredecessorSelect";
import { TaskLinkedResourcesSummary } from "@/components/metadata/TaskLinkedResourcesSummary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProcessDetail } from "@/lib/query/hooks/useProcess";
import {
  useCreateTaskAttribute,
  useTaskAttribute,
  useUpdateTaskAttribute,
} from "@/lib/query/hooks/useMetadata";
import { cn } from "@/lib/utils";
import type {
  FrequencyType,
  TaskAttributeDto,
  TaskAttributeI18nField,
  TaskAttributeI18nMap,
  UpsertTaskAttributeDto,
} from "@/types/metadata";
import type { ProcessNodeDto } from "@/types/process";

const frequencyOptions: FrequencyType[] = [
  "AD_HOC",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "EVENT_DRIVEN",
];

const textFields: TaskAttributeI18nField[] = [
  "definition",
  "purpose",
  "inputDeliverable",
  "inputDataDesc",
  "inputCondition",
  "outputDeliverable",
  "outputDataDesc",
  "outputCondition",
  "issues",
  "exceptions",
  "remarks",
];

type SectionId =
  | "definition"
  | "input"
  | "predecessor"
  | "output"
  | "owner"
  | "cycle"
  | "system"
  | "remarks";

type TaskAttributeFormProps = {
  nodeId: number;
  autoPredecessor?: PredecessorSelection | null;
  variant?: "page" | "sheet";
  /** 목록 행 등에서 즉시 표시할 임시 데이터 */
  attributePlaceholder?: TaskAttributeDto | null;
};

type SectionCardProps = {
  id: SectionId;
  title: string;
  description?: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: ReactNode;
};

type ScalarState = {
  frequency: FrequencyType | null;
  triggerEvent: string;
  duration: string;
  version: string;
};

type TaskAttributeEditorProps = {
  nodeId: number;
  process: ProcessNodeDto | null;
  attribute: TaskAttributeDto | null;
  autoPredecessor?: PredecessorSelection | null;
  variant: "page" | "sheet";
};

type TaskAttributeSheetToolbarState = {
  isSaving: boolean;
  dirty: boolean;
  onSave: () => void;
};

type TaskAttributeSheetToolbarRegistration = {
  isSaving: boolean;
  dirty: boolean;
  onSave: () => Promise<boolean>;
};

type TaskAttributeSheetContextValue = {
  toolbar: TaskAttributeSheetToolbarState | null;
  registerToolbar: (state: TaskAttributeSheetToolbarRegistration | null) => void;
  attemptClose: () => void;
};

const TaskAttributeSheetContext =
  createContext<TaskAttributeSheetContextValue | null>(null);

/** 시트 상세 — 헤더 저장·닫기와 폼 상태를 연결한다. */
export const TaskAttributeSheetProvider = ({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) => {
  const tb = useTranslations("bpmn");
  const [toolbar, setToolbar] = useState<TaskAttributeSheetToolbarState | null>(
    null,
  );
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const onSaveRef = useRef<() => Promise<boolean>>(async () => false);
  const invokeSave = useCallback(() => {
    void onSaveRef.current();
  }, []);
  const saveAndClose = useCallback(async () => onSaveRef.current(), []);
  const registerToolbar = useCallback(
    (state: TaskAttributeSheetToolbarRegistration | null) => {
      if (!state) {
        setToolbar(null);
        return;
      }

      onSaveRef.current = state.onSave;
      setToolbar((prev) => {
        if (
          prev &&
          prev.isSaving === state.isSaving &&
          prev.dirty === state.dirty
        ) {
          return prev;
        }

        return {
          isSaving: state.isSaving,
          dirty: state.dirty,
          onSave: invokeSave,
        };
      });
    },
    [invokeSave],
  );
  const attemptClose = useCallback(() => {
    if (toolbar?.dirty) {
      setLeaveDialogOpen(true);
      return;
    }
    onClose();
  }, [onClose, toolbar?.dirty]);
  const value = useMemo(
    () => ({ toolbar, registerToolbar, attemptClose }),
    [attemptClose, registerToolbar, toolbar],
  );

  const handleDiscardAndLeave = () => {
    setLeaveDialogOpen(false);
    onClose();
  };

  const handleSaveAndLeave = async () => {
    setLeaveSaving(true);
    try {
      const saved = await saveAndClose();
      if (saved) {
        setLeaveDialogOpen(false);
        onClose();
      }
    } finally {
      setLeaveSaving(false);
    }
  };

  return (
    <TaskAttributeSheetContext.Provider value={value}>
      {children}
      <Dialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveDialogOpen(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tb("leaveConfirmTitle")}</DialogTitle>
            <DialogDescription>{tb("leaveConfirmDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={leaveSaving}
              onClick={() => setLeaveDialogOpen(false)}
            >
              {tb("cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={leaveSaving}
              onClick={handleDiscardAndLeave}
            >
              {tb("leaveWithoutSave")}
            </Button>
            <Button
              type="button"
              disabled={leaveSaving}
              onClick={() => void handleSaveAndLeave()}
            >
              {leaveSaving ? tb("saving") : tb("saveAndLeave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TaskAttributeSheetContext.Provider>
  );
};

/** Provider 내부 — 미저장 시 시트 닫기를 가로챈다. */
export const TaskAttributeSheetGuard = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) => {
  const attemptClose = useContext(TaskAttributeSheetContext)?.attemptClose;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          onOpenChange(true);
          return;
        }
        attemptClose?.();
      }}
    >
      {children}
    </Sheet>
  );
};

/** 시트 헤더 제목 행 우측 — 저장 상태·저장·닫기 */
export const TaskAttributeSheetHeaderActions = () => {
  const t = useTranslations("metadata");
  const tc = useTranslations("common");
  const sheetContext = useContext(TaskAttributeSheetContext);
  const toolbar = sheetContext?.toolbar;
  const attemptClose = sheetContext?.attemptClose;

  return (
    <div className="flex shrink-0 items-center gap-2">
      {toolbar ? (
        <>
          <span
            className={cn(
              "text-xs text-muted-foreground",
              toolbar.dirty && "text-amber-600",
            )}
          >
            {toolbar.isSaving
              ? t("saving")
              : toolbar.dirty
                ? t("unsaved")
                : t("saved")}
          </span>
          <Button
            type="button"
            size="sm"
            disabled={toolbar.isSaving}
            onClick={toolbar.onSave}
          >
            <Save className="size-4" />
            {t("save")}
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="pams-page-action-outline"
        onClick={() => attemptClose?.()}
      >
        {tc("close")}
      </Button>
    </div>
  );
};

const emptyI18n = (): TaskAttributeI18nMap => ({
  ko: {},
  en: {},
  "zh-TW": {},
});

/** 조회된 Task 속성에서 다국어 입력 초기값을 만든다. */
const buildInitialI18n = (
  attribute: TaskAttributeDto | null,
): TaskAttributeI18nMap => {
  const nextI18n = emptyI18n();

  for (const field of textFields) {
    nextI18n.ko = {
      ...nextI18n.ko,
      [field]: attribute?.i18n.ko?.[field] ?? attribute?.[field] ?? null,
    };
    nextI18n.en = {
      ...nextI18n.en,
      [field]: attribute?.i18n.en?.[field] ?? null,
    };
    nextI18n["zh-TW"] = {
      ...nextI18n["zh-TW"],
      [field]: attribute?.i18n["zh-TW"]?.[field] ?? null,
    };
  }

  return nextI18n;
};

/** 조회된 Task 속성에서 단일값 필드 초기값을 만든다. */
const buildInitialScalar = (
  attribute: TaskAttributeDto | null,
): ScalarState => ({
  frequency: attribute?.frequency ?? null,
  triggerEvent: attribute?.triggerEvent ?? "",
  duration: attribute?.duration ?? "",
  version: attribute?.version ?? "1.0.0",
});

/** 조회된 선행 프로세스를 편집 가능한 선택 모델로 변환한다. */
const buildInitialPredecessors = (
  attribute: TaskAttributeDto | null,
  autoPredecessor?: PredecessorSelection | null,
): PredecessorSelection[] =>
  attribute?.predecessors.length
    ? attribute.predecessors.map((item) => ({
        predecessorNodeId: item.predecessorNodeId,
        predecessorCode: item.predecessorCode,
        predecessorName: item.predecessorName,
        predecessorLevel: item.predecessorLevel,
        conditionDesc: item.conditionDesc,
        isMandatory: item.isMandatory,
      }))
    : autoPredecessor
      ? [autoPredecessor]
      : [];

/** 접기/펼치기를 지원하는 Task 속성 섹션 카드다. */
const SectionCard = ({
  id,
  title,
  description,
  open,
  onToggle,
  children,
}: SectionCardProps) => {
  return (
    <Card>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onToggle(id)}
      >
        <CardHeader className="grid-cols-[1fr_auto] items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {open ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </CardHeader>
      </button>
      {open && <CardContent className="space-y-4">{children}</CardContent>}
    </Card>
  );
};

/** Task 속성 입력 폼 — 다국어 텍스트와 선행 프로세스를 저장한다. */
export const TaskAttributeForm = ({
  nodeId,
  autoPredecessor,
  variant = "page",
  attributePlaceholder,
}: TaskAttributeFormProps) => {
  const t = useTranslations("metadata");
  const needsProcess = variant === "page";
  const {
    data: process,
    isLoading: processLoading,
    isError: processError,
  } = useProcessDetail(nodeId, { enabled: needsProcess });
  const {
    data: attribute,
    isPending: attributePending,
    isError: attributeError,
  } = useTaskAttribute(nodeId, { placeholderData: attributePlaceholder });

  const isLoading = (needsProcess && processLoading) || attributePending;

  if (isLoading) {
    return (
      <LoadingSpinner
        label={t("loading")}
        className={variant === "sheet" ? "min-h-[480px]" : undefined}
      />
    );
  }

  if (attributeError || (needsProcess && (processError || !process))) {
    return (
      <EmptyState
        title={t("loadError")}
        className={variant === "sheet" ? "min-h-[480px]" : undefined}
      />
    );
  }

  return (
    <TaskAttributeEditor
      key={`${nodeId}-${attribute?.attrId ?? "new"}`}
      nodeId={nodeId}
      process={process ?? null}
      attribute={attribute ?? null}
      autoPredecessor={autoPredecessor}
      variant={variant}
    />
  );
};

/** 조회 완료 후 마운트되어 입력 상태를 관리한다. */
const TaskAttributeEditor = ({
  nodeId,
  process,
  attribute,
  autoPredecessor,
  variant,
}: TaskAttributeEditorProps) => {
  const t = useTranslations("metadata");
  const createMutation = useCreateTaskAttribute();
  const updateMutation = useUpdateTaskAttribute(nodeId);
  const [dirty, setDirty] = useState(false);
  const [definitionError, setDefinitionError] = useState<string | null>(null);
  const [i18n, setI18n] = useState<TaskAttributeI18nMap>(() =>
    buildInitialI18n(attribute),
  );
  const [predecessors, setPredecessors] = useState<PredecessorSelection[]>(() =>
    buildInitialPredecessors(attribute, autoPredecessor),
  );
  const [scalar, setScalar] = useState<ScalarState>(() =>
    buildInitialScalar(attribute),
  );
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () =>
      new Set([
        "definition",
        "input",
        "predecessor",
        "output",
        "cycle",
        "remarks",
      ]),
  );

  const markDirty = useCallback(() => {
    setDirty(true);
    setDefinitionError(null);
  }, []);

  const toggleSection = useCallback((id: SectionId) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const getTextValue = useCallback(
    (field: TaskAttributeI18nField): MultiLangTextValue => ({
      ko: i18n.ko?.[field] ?? "",
      en: i18n.en?.[field] ?? "",
      "zh-TW": i18n["zh-TW"]?.[field] ?? "",
    }),
    [i18n],
  );

  const updateTextField = useCallback(
    (field: TaskAttributeI18nField, value: MultiLangTextValue) => {
      setI18n((prev) => ({
        ko: { ...prev.ko, [field]: value.ko ?? null },
        en: { ...prev.en, [field]: value.en ?? null },
        "zh-TW": { ...prev["zh-TW"], [field]: value["zh-TW"] ?? null },
      }));
      markDirty();
    },
    [markDirty],
  );

  const updateScalar = useCallback(
    (patch: Partial<ScalarState>) => {
      setScalar((prev) => ({ ...prev, ...patch }));
      markDirty();
    },
    [markDirty],
  );

  const updatePredecessors = useCallback(
    (value: PredecessorSelection[]) => {
      setPredecessors(value);
      markDirty();
    },
    [markDirty],
  );

  const payload = useMemo<UpsertTaskAttributeDto>(
    () => ({
      nodeId,
      definition: i18n.ko?.definition ?? null,
      purpose: i18n.ko?.purpose ?? null,
      inputDeliverable: i18n.ko?.inputDeliverable ?? null,
      inputDataDesc: i18n.ko?.inputDataDesc ?? null,
      inputCondition: i18n.ko?.inputCondition ?? null,
      outputDeliverable: i18n.ko?.outputDeliverable ?? null,
      outputDataDesc: i18n.ko?.outputDataDesc ?? null,
      outputCondition: i18n.ko?.outputCondition ?? null,
      frequency: scalar.frequency,
      triggerEvent: scalar.triggerEvent || null,
      duration: scalar.duration || null,
      issues: i18n.ko?.issues ?? null,
      exceptions: i18n.ko?.exceptions ?? null,
      remarks: i18n.ko?.remarks ?? null,
      version: scalar.version || "1.0.0",
      i18n,
      predecessors: predecessors.map((item) => ({
        predecessorNodeId: item.predecessorNodeId,
        conditionDesc: item.conditionDesc ?? null,
        isMandatory: item.isMandatory ?? true,
      })),
    }),
    [i18n, nodeId, predecessors, scalar],
  );

  const save = useCallback(
    async (validate = true): Promise<boolean> => {
      if (validate && !payload.i18n?.ko?.definition?.trim()) {
        setDefinitionError(t("definitionRequired"));
        return false;
      }

      try {
        if (attribute) {
          await updateMutation.mutateAsync(payload);
        } else {
          await createMutation.mutateAsync(payload);
        }

        setDirty(false);
        return true;
      } catch {
        return false;
      }
    },
    [attribute, createMutation, payload, t, updateMutation],
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSheet = variant === "sheet";
  const registerToolbar = useContext(TaskAttributeSheetContext)?.registerToolbar;
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  const frequencyLabel = scalar.frequency
    ? t(`frequencyOptions.${scalar.frequency}`)
    : undefined;

  useEffect(() => {
    if (!isSheet || !registerToolbar) {
      return;
    }

    registerToolbar({
      isSaving,
      dirty,
      onSave: () => saveRef.current(true),
    });

    return () => {
      registerToolbar(null);
    };
  }, [dirty, isSaving, isSheet, registerToolbar]);

  return (
    <form
      className={cn(
        "space-y-4",
        isSheet ? "w-full px-0 py-0" : "mx-auto max-w-5xl p-6",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void save(true);
      }}
    >
      {!isSheet && process ? (
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("breadcrumb")}</p>
            <h1 className="text-2xl font-semibold">
              {process.code} {process.displayName ?? process.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs text-muted-foreground",
                dirty && "text-amber-600",
              )}
            >
              {isSaving
                ? t("saving")
                : dirty
                  ? t("unsaved")
                  : t("saved")}
            </span>
            <Button type="submit" disabled={isSaving}>
              <Save className="size-4" />
              {t("save")}
            </Button>
          </div>
        </div>
      ) : null}

      <SectionCard
        id="definition"
        title={t("taskDefinition")}
        open={openSections.has("definition")}
        onToggle={toggleSection}
      >
        <MultiLangInput
          mode="text"
          label={t("definition")}
          textValue={getTextValue("definition")}
          onTextChange={(value) => updateTextField("definition", value)}
          required
          rows={4}
          error={definitionError ?? undefined}
          placeholder={t("definitionPlaceholder")}
        />
      </SectionCard>

      <SectionCard
        id="input"
        title={t("inputInfo")}
        open={openSections.has("input")}
        onToggle={toggleSection}
      >
        <MultiLangInput
          mode="text"
          label={t("inputDeliverable")}
          textValue={getTextValue("inputDeliverable")}
          onTextChange={(value) => updateTextField("inputDeliverable", value)}
          rows={3}
        />
      </SectionCard>

      <SectionCard
        id="predecessor"
        title={t("predecessor")}
        open={openSections.has("predecessor")}
        onToggle={toggleSection}
      >
        <PredecessorSelect
          nodeId={nodeId}
          value={predecessors}
          onChange={updatePredecessors}
        />
      </SectionCard>

      <SectionCard
        id="output"
        title={t("outputInfo")}
        open={openSections.has("output")}
        onToggle={toggleSection}
      >
        <MultiLangInput
          mode="text"
          label={t("outputDeliverable")}
          textValue={getTextValue("outputDeliverable")}
          onTextChange={(value) => updateTextField("outputDeliverable", value)}
          rows={3}
        />
      </SectionCard>

      <SectionCard
        id="owner"
        title={t("ownerSection")}
        description={t("ownerSectionDesc")}
        open={openSections.has("owner")}
        onToggle={toggleSection}
      >
        <EmptyState title={t("raciSeparate")} />
      </SectionCard>

      <SectionCard
        id="cycle"
        title={t("cycleSection")}
        open={openSections.has("cycle")}
        onToggle={toggleSection}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("frequency")}</Label>
            <Select
              value={scalar.frequency ?? ""}
              onValueChange={(value) =>
                updateScalar({ frequency: value as FrequencyType })
              }
            >
              <SelectTrigger variant="filter">
                <SelectValue placeholder={t("selectFrequency")}>
                  {frequencyLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent variant="filter">
                {frequencyOptions.map((frequency) => (
                  <SelectItem variant="filter" key={frequency} value={frequency}>
                    {t(`frequencyOptions.${frequency}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="system"
        title={t("systemSection")}
        description={t("systemSectionDesc")}
        open={openSections.has("system")}
        onToggle={toggleSection}
      >
        {openSections.has("system") ? (
          <TaskLinkedResourcesSummary nodeId={nodeId} />
        ) : null}
      </SectionCard>

      <SectionCard
        id="remarks"
        title={t("remarksSection")}
        open={openSections.has("remarks")}
        onToggle={toggleSection}
      >
        <MultiLangInput
          mode="text"
          label={t("remarks")}
          textValue={getTextValue("remarks")}
          onTextChange={(value) => updateTextField("remarks", value)}
          rows={4}
        />
      </SectionCard>
    </form>
  );
};
