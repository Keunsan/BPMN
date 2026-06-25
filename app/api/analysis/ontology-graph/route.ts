import { ApiError } from "@/lib/api/error-handler";
import { withApiHandler } from "@/lib/api/route-handler";
import { buildOntologyContext } from "@/lib/services/ontology-export.service";

/** GET /api/analysis/ontology-graph — 온톨로지 subgraph export */
export const GET = withApiHandler(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const centerIdParam = searchParams.get("centerId");
  const depthParam = Number(searchParams.get("depth") ?? "2");
  const pocBundle = searchParams.get("pocBundle") === "true";

  const depth = depthParam === 1 ? 1 : 2;

  if (pocBundle || !centerIdParam) {
    const data = await buildOntologyContext({ includePocBundle: true, depth });
    return { data };
  }

  if (!/^\d+$/.test(centerIdParam)) {
    throw new ApiError("E001", "centerId must be a number", 400);
  }

  const data = await buildOntologyContext({
    centerNodeId: Number(centerIdParam),
    depth,
  });

  return { data };
});
