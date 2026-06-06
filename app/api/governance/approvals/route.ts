import { requireAuth } from "@/lib/api/auth";
import { withApiHandler } from "@/lib/api/route-handler";
import { handleApproval, listPendingApprovals } from "@/lib/services/process.service";

/** GET /api/governance/approvals — 승인 대기 목록 */
export const GET = withApiHandler(async () => {
  const data = await listPendingApprovals();
  return { data };
});

/** PUT /api/governance/approvals — 승인/반려 처리 */
export const PUT = withApiHandler(async ({ request }) => {
  const auth = await requireAuth();
  const body = (await request.json()) as {
    requestId: number;
    action: "APPROVE" | "REJECT";
    comment?: string;
    targetStatus?: "APPROVED" | "PUBLISHED";
  };

  await handleApproval({
    requestId: body.requestId,
    approverId: auth.userId,
    action: body.action,
    comment: body.comment,
    targetStatus: body.targetStatus,
  });

  return { data: { success: true } };
});
