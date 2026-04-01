import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { getLinearClientForUser } from "@/lib/linear";

/**
 * BCF API 3.0 – GET /bcf/3.0/extensions
 * Returns the available topic statuses, types, priorities, and labels
 * sourced from the connected Linear workspace.
 */
export async function GET(req: NextRequest) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 503 });
  }

  const teamId = ctx.projectMapping?.linearTeamId;

  // Fetch workflow states (statuses) for the team
  let topicStatuses: string[] = ["Open", "In Progress", "Resolved", "Closed"];
  let topicLabels: string[] = [];

  if (teamId) {
    const [states, labels] = await Promise.all([
      linear.workflowStates({ filter: { team: { id: { eq: teamId } } } }),
      linear.issueLabels({ filter: { team: { id: { eq: teamId } } } }),
    ]);
    topicStatuses = (await states).nodes.map((s) => s.name);
    topicLabels = (await labels).nodes.map((l) => l.name);
  }

  return NextResponse.json({
    topic_type: ["Clash", "Issue", "Request", "Fault", "Remark", "Unknown"],
    topic_status: topicStatuses,
    topic_label: topicLabels,
    snippet_type: [],
    priority: ["Critical", "Major", "Normal", "Minor", "On hold"],
    user_id_type: [],
  });
}
