/**
 * PAMS BPMN 팔레트 확장 — Call Activity 생성 항목 추가
 * bpmn-js 기본 PaletteProvider에는 Call Activity가 없음
 */

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
  registerProvider: (provider: { getPaletteEntries: () => Record<string, unknown> }) => void;
};

type PamsPaletteProviderDeps = [
  PaletteRegistry,
  PaletteCreate,
  PaletteElementFactory,
  PaletteTranslate,
];

/** Call Activity 팔레트 항목을 등록한다 */
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
    palette.registerProvider(this);
  }

  getPaletteEntries(): Record<string, unknown> {
    const { create, elementFactory, translate } = this;

    const createCallActivity = (event: Event) => {
      const shape = elementFactory.createShape({ type: "bpmn:CallActivity" });
      create.start(event, shape);
    };

    return {
      "create.call-activity": {
        group: "activity",
        className: "bpmn-icon-call-activity",
        title: translate("Create call activity"),
        action: {
          dragstart: createCallActivity,
          click: createCallActivity,
        },
      },
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
