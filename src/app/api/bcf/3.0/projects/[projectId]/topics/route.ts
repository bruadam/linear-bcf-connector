import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { getLinearClientForUser, linearPriorityToBcf, bcfPriorityToLinear } from "@/lib/linear";
import { prisma } from "@/lib/prisma";
import { generateBcfGuid } from "@/lib/utils";

type Params = { params: Promise<{ projectId: string }> };

/**
 * BCF API 3.0 – GET /bcf/3.0/projects/{projectId}/topics
 * List all topics (Linear issues) for a given project (Linear team).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { projectId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 503 });
  }

  const issues = await linear.issues({
    filter: { team: { id: { eq: projectId } } },
    first: 100,
  });

  const topics = await Promise.all(
    issues.nodes.map(async (issue) => {
      const assignee = await issue.assignee;
      return {
        guid: issue.id,
        topic_type: "Issue",
        topic_status: (await issue.state)?.name ?? "Open",
        reference_links: [],
        title: issue.title,
        priority: linearPriorityToBcf(issue.priority),
        index: issue.number,
        labels: (await issue.labels()).nodes.map((l) => l.name),
        creation_date: issue.createdAt?.toISOString(),
        created_by: (await issue.creator)?.email ?? "",
        modified_date: issue.updatedAt?.toISOString(),
        modified_by: (await issue.creator)?.email ?? "",
        assigned_to: assignee?.email ?? "",
        stage: "",
        description: issue.description ?? "",
        due_date: issue.dueDate ?? undefined,
        authorization: {
          topic_actions: ["updateTopic", "createViewpoint", "createComment"],
          comment_actions: ["updateComment"],
        },
      };
    })
  );

  return NextResponse.json(topics);
}

/**
 * BCF API 3.0 – POST /bcf/3.0/projects/{projectId}/topics
 * Create a new topic (Linear issue).
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { projectId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 503 });
  }

  const body = await req.json();

  // Look up project mapping to get the linear project ID
  const team = await linear.team(projectId);
  if (!team) {
    return NextResponse.json({ message: "Team not found" }, { status: 404 });
  }

  const issue = await linear.createIssue({
    teamId: projectId,
    title: body.title ?? "Untitled BCF Topic",
    description: body.description ?? "",
    priority: bcfPriorityToLinear(body.priority),
    dueDate: body.due_date ? new Date(body.due_date).toISOString() : undefined,
  });

  const createdIssue = await issue.issue;
  if (!createdIssue) {
    return NextResponse.json({ message: "Failed to create issue" }, { status: 500 });
  }

  // Persist mapping in our DB
  const bcfGuid = generateBcfGuid();
  await prisma.bcfTopic.upsert({
    where: { bcfGuid },
    update: {},
    create: {
      bcfGuid,
      title: createdIssue.title,
      description: createdIssue.description ?? undefined,
      linearIssueId: createdIssue.id,
      linearIssueUrl: createdIssue.url,
    },
  });

  return NextResponse.json(
    {
      guid: createdIssue.id,
      topic_status: "Open",
      title: createdIssue.title,
      creation_date: createdIssue.createdAt?.toISOString(),
      priority: body.priority ?? "Normal",
      description: createdIssue.description ?? "",
    },
    { status: 201 }
  );
}
