declare module "bpmn-js/lib/Modeler" {
  export default class BpmnModeler {
    constructor(options: Record<string, unknown>);
    importXML(xml: string): Promise<{ warnings: unknown[] }>;
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>;
    saveSVG(): Promise<{ svg?: string }>;
    get(name: string): unknown;
    destroy(): void;
  }
}

declare module "bpmn-js/lib/NavigatedViewer" {
  export default class NavigatedViewer {
    constructor(options: Record<string, unknown>);
    importXML(xml: string): Promise<{ warnings: unknown[] }>;
    get(name: string): unknown;
    destroy(): void;
  }
}

declare module "bpmn-js-properties-panel" {
  export const BpmnPropertiesPanelModule: unknown;
  export const BpmnPropertiesProviderModule: unknown;
}

declare module "diagram-js-minimap" {
  const minimapModule: unknown;
  export default minimapModule;
}

declare module "bpmn-js/dist/assets/diagram-js.css";
declare module "bpmn-js/dist/assets/bpmn-js.css";
declare module "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
declare module "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
declare module "diagram-js-minimap/assets/diagram-js-minimap.css";
