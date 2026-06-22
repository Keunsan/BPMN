/**
 * PAMS BPMN 팔레트 확장 — 태스크 유형별 생성 · Call Activity
 */

import {
  BPMN_TASK_TYPE_ICON_CLASS,
  BPMN_TASK_TYPE_PALETTE_TITLE,
} from "@/lib/constants/bpmn-task-types";
import {
  BPMN_MORPHABLE_TASK_TYPES,
  mapBpmnElementTypeToJs,
} from "@/lib/utils/bpmn-xml";

type PaletteCreate = {
  start: (
    event: Event,
    shape: object | object[],
    options?: { hints?: { autoSelect?: object[] } },
  ) => void;
};

type PaletteElementFactory = {
  createShape: (attrs: { type: string; x?: number; y?: number }) => object;
};

type PaletteTranslate = (template: string) => string;

type PaletteRegistry = {
  registerProvider: (
    priority: number | { getPaletteEntries: () => PaletteEntriesResult },
    provider?: { getPaletteEntries: () => PaletteEntriesResult },
  ) => void;
};

type PaletteEntry = Record<string, unknown>;

type PaletteEntriesResult =
  | Record<string, PaletteEntry>
  | ((entries: Record<string, PaletteEntry>) => Record<string, PaletteEntry>);

const buildCreateShapeEntry = (
  create: PaletteCreate,
  elementFactory: PaletteElementFactory,
  type: string,
  group: string,
  className: string,
  title: string,
): PaletteEntry => {
  const listener = (event: Event) => {
    const shape = elementFactory.createShape({ type });
    create.start(event, shape);
  };

  return {
    group,
    className,
    title,
    action: {
      dragstart: listener,
      click: listener,
    },
  };
};

/** 팔레트에 태스크 유형·Call Activity 항목을 등록한다 */
class PamsPaletteProvider {
  private readonly create: PaletteCreate;
  private readonly elementFactory: PaletteElementFactory;
  private readonly translate: PaletteTranslate;

  constructor(
    palette: PaletteRegistry,
    create: PaletteCreate,
    elementFactory: PaletteElementFactory,
    translate: PaletteTranslate,
  ) {
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    // 기본 PaletteProvider(1000) 이후에 실행되어 entries를 수정한다
    palette.registerProvider(500, this);
  }

  getPaletteEntries(): PaletteEntriesResult {
    const { create, elementFactory, translate } = this;

    return (entries) => {
      delete entries["create.task"];

      const rebuilt: Record<string, PaletteEntry> = {};

      for (const [id, entry] of Object.entries(entries)) {
        rebuilt[id] = entry;

        if (id === "tool-separator") {
          for (const taskType of BPMN_MORPHABLE_TASK_TYPES) {
            const jsType = mapBpmnElementTypeToJs(taskType);
            if (!jsType) {
              continue;
            }

            rebuilt[`create.${taskType.toLowerCase().replace(/_/g, "-")}`] =
              buildCreateShapeEntry(
                create,
                elementFactory,
                jsType,
                "tools",
                BPMN_TASK_TYPE_ICON_CLASS[taskType],
                BPMN_TASK_TYPE_PALETTE_TITLE[taskType],
              );
          }
        }
      }

      rebuilt["create.call-activity"] = buildCreateShapeEntry(
        create,
        elementFactory,
        "bpmn:CallActivity",
        "activity",
        "bpmn-icon-call-activity",
        translate("Create call activity"),
      );

      return rebuilt;
    };
  }
}

(PamsPaletteProvider as unknown as { $inject: string[] }).$inject = [
  "palette",
  "create",
  "elementFactory",
  "translate",
];

export const pamsPaletteModule = {
  __init__: ["pamsPaletteProvider"],
  pamsPaletteProvider: ["type", PamsPaletteProvider],
};

export type { PamsPaletteProviderDeps };

type PamsPaletteProviderDeps = [
  PaletteRegistry,
  PaletteCreate,
  PaletteElementFactory,
  PaletteTranslate,
];
