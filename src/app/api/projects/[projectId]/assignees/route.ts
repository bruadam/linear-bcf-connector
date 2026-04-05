import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganization } from "@/lib/organization";
import { getLinearClientForUser } from "@/lib/linear";

/**
 * GET /api/projects/[projectId]/assignees
 * Fetch the assignee list from the Linear team linked to this project.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.organizationId !== org.id) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  if (!project.linearTeamId) {
    return NextResponse.json(
      { message: "No Linear team linked to this project", assignees: [] },
      { status: 200 }
    );
  }

  const linear = await getLinearClientForUser(user.id);
  if (!linear) {
    return NextResponse.json(
      { message: "Linear not connected", assignees: [] },
      { status: 200 }
    );
  }

  const team = await linear.team(project.linearTeamId);
  const membersConnection = await team.members();
  const members = membersConnection.nodes;

  const assignees = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    displayName: m.displayName,
    avatarUrl: m.avatarUrl,
    active: m.active,
  }));

  return NextResponse.json({ assignees });
}
