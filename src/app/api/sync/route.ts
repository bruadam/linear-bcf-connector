import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { getLinearClientForUser } from "@/lib/linear";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/sync
 * Syncs Linear users, statuses and labels back to the app settings
 * so they can be exposed via the BCF extensions endpoint.
 */
export async function POST(req: NextRequest) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const linear = await getLinearClientForUser(user.id);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 400 });
  }

  const connection = await prisma.linearConnection.findUnique({
    where: { userId: user.id },
    include: { projectMappings: true },
  });

  const teamId = connection?.projectMappings?.[0]?.linearTeamId;

  // Fetch users, states, labels in parallel
  const [orgUsers, states, labels] = await Promise.all([
    linear.users(),
    teamId
      ? linear.workflowStates({ filter: { team: { id: { eq: teamId } } } })
      : Promise.resolve({ nodes: [] }),
    teamId
      ? linear.issueLabels({ filter: { team: { id: { eq: teamId } } } })
      : Promise.resolve({ nodes: [] }),
  ]);

  const summary = {
    users: orgUsers.nodes.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    statuses: states.nodes.map((s) => ({ id: s.id, name: s.name, color: s.color, type: s.type })),
    labels: labels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
  };

  // Update app settings with latest sync data
  await prisma.appSettings.upsert({
    where: { userId: user.id },
    update: {
      priorityLabels: buildDefaultPriorityLabels(),
    },
    create: {
      userId: user.id,
      priorityLabels: buildDefaultPriorityLabels(),
    },
  });

  return NextResponse.json({ success: true, ...summary });
}

/**
 * GET /api/sync
 * Returns the last-synced data.
 */
export async function GET(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const linear = await getLinearClientForUser(user.id);
  if (!linear) return NextResponse.json({ message: "Linear not connected" }, { status: 400 });

  const connection = await prisma.linearConnection.findUnique({
    where: { userId: user.id },
    include: { projectMappings: true },
  });

  const teamId = connection?.projectMappings?.[0]?.linearTeamId;

  const [orgUsers, states, labels] = await Promise.all([
    linear.users(),
    teamId
      ? linear.workflowStates({ filter: { team: { id: { eq: teamId } } } })
      : Promise.resolve({ nodes: [] }),
    teamId
      ? linear.issueLabels({ filter: { team: { id: { eq: teamId } } } })
      : Promise.resolve({ nodes: [] }),
  ]);

  return NextResponse.json({
    users: orgUsers.nodes.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    statuses: states.nodes.map((s) => ({ id: s.id, name: s.name, color: s.color, type: s.type })),
    labels: labels.nodes.map((l) => ({ id: l.id, name: l.name, color: l.color })),
  });
}

function buildDefaultPriorityLabels() {
  return [
    { value: 0, label: "No priority", color: "#95A5A6" },
    { value: 1, label: "Urgent", color: "#E74C3C" },
    { value: 2, label: "High", color: "#E67E22" },
    { value: 3, label: "Medium", color: "#F1C40F" },
    { value: 4, label: "Low", color: "#3498DB" },
  ];
}
