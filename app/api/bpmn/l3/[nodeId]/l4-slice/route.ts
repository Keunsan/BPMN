import { withApiHandler } from "@/lib/api/route-handler";
import * as bpmnQueries from "@/lib/db/queries/bpmn";
import { findProcessById } from "@/lib/db/queries/process";
import { ApiError } from "@/lib/api/error-handler";
import { buildL4SliceFromL3Bpmn } from "@/lib/utils/bpmn-l4-slice";

/** GET /api/bpmn/l3/[nodeId]/l4-slice — drill-down용 L4 Task slice */
export const GET = withApiHandler(async ({ params }) => {
  const nodeId = Number(params.nodeId);
  const process = await findProcessById(nodeId);
  if (!process) {
    throw new ApiError("E302", "Process not found", 404);
  }
  if (process.level !== "L3") {
    throw new ApiError("E405", "L4 slice is only available for L3 processes", 400);
  }

  const model = await bpmnQueries.findCurrentBpmnModelByNodeId(nodeId);
  if (!model) {
    return { data: null };
  }

  const elements = await bpmnQueries.listBpmnElements(model.modelId);
  const slice = buildL4SliceFromL3Bpmn({
    bpmnXml: model.bpmnXml,
    elements: elements.map((el) => ({
      elementBpmnId: el.elementBpmnId,
      elementType: el.elementType,
      elementName: el.elementName,
      linkedNodeId: el.linkedNodeId,
      linkedProcessCode: el.linkedProcessCode,
      linkedProcessName: el.linkedProcessName,
      properties: el.properties,
    })),
  });

  return {
    data: slice
      ? {
          ...slice,
          l3NodeId: nodeId,
          l3Code: process.code,
          l3Name: process.name,
          sourceModelId: model.modelId,
        }
      : null,
  };
});
