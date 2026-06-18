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
import { SheetClose } from "@/components/ui/sheet";
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
  process: ProcessNodeDto;
  attribute: TaskAttributeDto | null;
  autoPredecessor?: PredecessorSelection | null;
  variant: "page" | "sheet";
};

type TaskAttributeSheetToolbarState = {
  isSaving: boolean;
  dirty: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
};

type TaskAttributeSheetContextValue = {
  toolbar: TaskAttributeSheetToolbarState | null;
  registerToolbar: (state: TaskAttributeSheetToolbarState | null) => void;
};

const TaskAttributeSheetContext =
  createContext<TaskAttributeSheetContextValue | null>(null);

/** 시트 상세 — 헤더 저장·닫기와 폼 상태를 연결한다. */
export const TaskAttributeSheetProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [toolbar, setToolbar] = useState<TaskAttributeSheetToolbarState | null>(
    null,
  );
  const registerToolbar = useCallback(
    (state: TaskAttributeSheetToolbarState | null) => {
      setToolbar(state);
    },
    [],
  );
  const value = useMemo(
    () => ({ toolbar, registerToolbar }),
    [registerToolbar, toolbar],
  );

  return (
    <TaskAttributeSheetContext.Provider value={value}>
      {children}
    </TaskAttributeSheetContext.Provider>
  );
};

/** 시트 헤더 제목 행 우측 — 저장 상태·저장·닫기 */
export const TaskAttributeSheetHeaderActions = () => {
  const t = useTranslations("metadata");
  const tc = useTranslations("common");
  const sheetContext = useContext(TaskAttributeSheetContext);
  const toolbar = sheetContext?.toolbar;

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
                : toolbar.lastSavedAt
                  ? t("autoSaved")
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
      <SheetClose
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pams-page-action-outline"
          />
        }
      >
        {tc("close")}
      </SheetClose>
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
}: TaskAttributeFormProps) => {
  const t = useTranslations("metadata");
  const {
    data: process,
    isLoading: processLoading,
    isError: processError,
  } = useProcessDetail(nodeId);
  const {
    data: attribute,
    isLoading: attributeLoading,
    isError: attributeError,
  } = useTaskAttribute(nodeId);

  const isLoading = processLoading || attributeLoading;

  if (isLoading) {
    return (
      <LoadingSpinner
        label={t("loading")}
        className={variant === "sheet" ? "min-h-[480px]" : undefined}
      />
    );
  }

  if (processError || attributeError || !process) {
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
      process={process}
      attribute={attribute ?? null}
      autoPredecessor={autoPredecessor}
      variant={variant}
    />
  );
};

/** 조회 완료 후 마운트되어 입력 상태와 자동저장을 관리한다. */
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
  const hydratedRef = useRef(true);
  const shouldSaveAutoPredecessor =
    Boolean(autoPredecessor) && (attribute?.predecessors.length ?? 0) === 0;
  const [dirty, setDirty] = useState(shouldSaveAutoPredecessor);
  const [definitionError, setDefinitionError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
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
    async (validate = true) => {
      if (validate && !payload.i18n?.ko?.definition?.trim()) {
        setDefinitionError(t("definitionRequired"));
        return;
      }

      if (attribute) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }

      setDirty(false);
      setLastSavedAt(new Date());
    },
    [attribute, createMutation, payload, t, updateMutation],
  );

  useEffect(() => {
    if (!hydratedRef.current || !dirty) return;
    if (!payload.i18n?.ko?.definition?.trim()) return;

    const timer = window.setTimeout(() => {
      void save(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [dirty, payload, save]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isSheet = variant === "sheet";
  const sheetContext = useContext(TaskAttributeSheetContext);
  const frequencyLabel = scalar.frequency
    ? t(`frequencyOptions.${scalar.frequency}`)
    : undefined;

  useEffect(() => {
    if (!isSheet || !sheetContext) {
      return;
    }

    sheetContext.registerToolbar({
      isSaving,
      dirty,
      lastSavedAt,
      onSave: () => {
        void save(true);
      },
    });

    return () => {
      sheetContext.registerToolbar(null);
    };
  }, [
    dirty,
    isSaving,
    isSheet,
    lastSavedAt,
    save,
    sheetContext,
  ]);

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
      {!isSheet && (
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
                  : lastSavedAt
                    ? t("autoSaved")
                    : t("saved")}
            </span>
            <Button type="submit" disabled={isSaving}>
              <Save className="size-4" />
              {t("save")}
            </Button>
          </div>
        </div>
      )}

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
        <TaskLinkedResourcesSummary nodeId={nodeId} />
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
