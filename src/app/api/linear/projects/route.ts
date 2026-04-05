import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { getLinearClientForUser } from "@/lib/linear";

/**
 * GET /api/linear/projects?teamId=xxx
 * List all Linear projects for a given team.
 */
export async function GET(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const linear = await getLinearClientForUser(user.id);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected", projects: [] }, { status: 200 });
  }

  const teamId = req.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ message: "teamId query param required" }, { status: 400 });
  }

  const projectsConnection = await linear.projects({
    filter: {
      accessibleTeams: { some: { id: { eq: teamId } } },
    },
  });

  const projects = projectsConnection.nodes.map((p) => ({
    id: p.id,
    name: p.name,
    state: p.state,
  }));

  return NextResponse.json({ projects });
}
