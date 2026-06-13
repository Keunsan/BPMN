/**
 * PAMS BPMN context pad 확장 — 선택 요소에서 Call Activity 이어 붙이기
 */

type DiagramElement = {
  type: string;
  businessObject?: {
    $type?: string;
    isForCompensation?: boolean;
  };
};

type ContextPadRegistry = {
  registerProvider: (provider: {
    getContextPadEntries: (element: DiagramElement) => Record<string, unknown>;
  }) => void;
};

type ContextPadCreate = {
  start: (
    event: Event,
    shape: object,
    context?: { source: DiagramElement },
  ) => void;
};

type ContextPadElementFactory = {
  createShape: (attrs: { type: string }) => object;
};

type ContextPadAutoPlace = {
  append: (source: DiagramElement, shape: object) => void;
};

type ContextPadAppendPreview = {
  create: (
    source: DiagramElement,
    type: string,
    options?: Record<string, unknown>,
  ) => void;
  cleanUp: () => void;
};

type ContextPadTranslate = (template: string) => string;

/** EndEvent 등에서 Call Activity append를 숨긴다 */
const canAppendCallActivity = (element: DiagramElement): boolean => {
  if (element.type === "label") {
    return false;
  }

  const businessObject = element.businessObject;
  if (!businessObject?.$type) {
    return false;
  }

  if (businessObject.$type === "bpmn:EndEvent") {
    return false;
  }

  if (businessObject.isForCompensation) {
    return false;
  }

  if (businessObject.$type === "bpmn:EventBasedGateway") {
    return false;
  }

  return (
    businessObject.$type.startsWith("bpmn:") &&
    !businessObject.$type.includes("SequenceFlow") &&
    !businessObject.$type.includes("TextAnnotation") &&
    !businessObject.$type.includes("DataObject") &&
    !businessObject.$type.includes("DataStore") &&
    !businessObject.$type.includes("MessageFlow")
  );
};

/** Call Activity context pad provider */
class PamsContextPadProvider {
  private readonly create: ContextPadCreate;
  private readonly elementFactory: ContextPadElementFactory;
  private readonly translate: ContextPadTranslate;
  private readonly autoPlace?: ContextPadAutoPlace;
  private readonly appendPreview?: ContextPadAppendPreview;

  constructor(
    contextPad: ContextPadRegistry,
    create: ContextPadCreate,
    elementFactory: ContextPadElementFactory,
    translate: ContextPadTranslate,
    autoPlace: ContextPadAutoPlace,
    appendPreview: ContextPadAppendPreview,
  ) {
    this.create = create;
    this.elementFactory = elementFactory;
    this.translate = translate;
    this.autoPlace = autoPlace;
    this.appendPreview = appendPreview;
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: DiagramElement): Record<string, unknown> {
    if (!canAppendCallActivity(element)) {
      return {};
    }

    const { create, elementFactory, translate, autoPlace, appendPreview } = this;
    const callActivityType = "bpmn:CallActivity";

    const appendStart = (event: Event, source: DiagramElement) => {
      const shape = elementFactory.createShape({ type: callActivityType });
      create.start(event, shape, { source });
    };

    const appendClick = autoPlace
      ? (_: Event, source: DiagramElement) => {
          const shape = elementFactory.createShape({ type: callActivityType });
          autoPlace.append(source, shape);
        }
      : appendStart;

    const appendHover = autoPlace
      ? (_: Event, source: DiagramElement) => {
          appendPreview?.create(source, callActivityType);
          return () => {
            appendPreview?.cleanUp();
          };
        }
      : null;

    return {
      "append.call-activity": {
        group: "model",
        className: "bpmn-icon-call-activity",
        title: translate("Append call activity"),
        action: {
          dragstart: appendStart,
          click: appendClick,
          ...(appendHover ? { hover: appendHover } : {}),
        },
      },
    };
  }
}

(PamsContextPadProvider as unknown as { $inject: string[] }).$inject = [
  "contextPad",
  "create",
  "elementFactory",
  "translate",
  "autoPlace",
  "appendPreview",
];

export const pamsContextPadModule = {
  __init__: ["pamsContextPadProvider"],
  pamsContextPadProvider: ["type", PamsContextPadProvider],
};
