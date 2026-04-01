import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { getLinearClientForUser } from "@/lib/linear";

/**
 * BCF API 3.0 – GET /bcf/3.0/projects
 * Returns projects available to the authenticated user.
 * We map Linear teams/projects to BCF projects.
 */
export async function GET(req: NextRequest) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 503 });
  }

  const teams = await linear.teams();

  const projects = teams.nodes.map((team) => ({
    project_id: team.id,
    name: team.name,
    authorization: {
      project_actions: ["createTopic", "createDocument"],
      topic_actions: [
        "updateTopic",
        "createViewpoint",
        "createComment",
        "updateComment",
        "updateBimSnippet",
        "updateRelatedTopics",
        "updateDocumentReferences",
      ],
      comment_actions: ["updateComment"],
    },
  }));

  return NextResponse.json(projects);
}
