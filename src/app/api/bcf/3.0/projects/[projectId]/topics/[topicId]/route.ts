import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { getLinearClientForUser, linearPriorityToBcf, bcfPriorityToLinear } from "@/lib/linear";

type Params = { params: Promise<{ projectId: string; topicId: string }> };

/**
 * BCF API 3.0 – GET /bcf/3.0/projects/{projectId}/topics/{topicId}
 * Retrieve a single topic.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { topicId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) return NextResponse.json({ message: "Linear not connected" }, { status: 503 });

  const issue = await linear.issue(topicId);
  if (!issue) return NextResponse.json({ message: "Topic not found" }, { status: 404 });

  const [state, assignee, labels, creator] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.labels(),
    issue.creator,
  ]);

  return NextResponse.json({
    guid: issue.id,
    topic_type: "Issue",
    topic_status: state?.name ?? "Open",
    title: issue.title,
    priority: linearPriorityToBcf(issue.priority),
    labels: labels.nodes.map((l) => l.name),
    creation_date: issue.createdAt?.toISOString(),
    created_by: creator?.email ?? "",
    modified_date: issue.updatedAt?.toISOString(),
    assigned_to: assignee?.email ?? "",
    description: issue.description ?? "",
    due_date: issue.dueDate ?? undefined,
  });
}

/**
 * BCF API 3.0 – PUT /bcf/3.0/projects/{projectId}/topics/{topicId}
 * Update a topic.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { topicId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) return NextResponse.json({ message: "Linear not connected" }, { status: 503 });

  const body = await req.json();

  // Update the Linear issue
  const result = await linear.updateIssue(topicId, {
    title: body.title,
    description: body.description,
    priority: body.priority ? bcfPriorityToLinear(body.priority) : undefined,
    dueDate: body.due_date ? new Date(body.due_date).toISOString() : undefined,
  });

  const updated = await result.issue;
  if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({
    guid: updated.id,
    title: updated.title,
    description: updated.description ?? "",
    priority: body.priority ?? linearPriorityToBcf(updated.priority),
    modified_date: updated.updatedAt?.toISOString(),
  });
}

/**
 * BCF API 3.0 – DELETE /bcf/3.0/projects/{projectId}/topics/{topicId}
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { topicId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) return NextResponse.json({ message: "Linear not connected" }, { status: 503 });

  await linear.deleteIssue(topicId);
  return new NextResponse(null, { status: 204 });
}
