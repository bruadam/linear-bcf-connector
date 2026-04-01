import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { getLinearClientForUser } from "@/lib/linear";

type Params = { params: Promise<{ projectId: string; topicId: string }> };

/**
 * BCF API 3.0 – GET /bcf/3.0/projects/{projectId}/topics/{topicId}/comments
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { topicId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) return NextResponse.json({ message: "Linear not connected" }, { status: 503 });

  const issue = await linear.issue(topicId);
  const commentsConn = await issue.comments();

  const comments = commentsConn.nodes.map((c) => ({
    guid: c.id,
    date: c.createdAt?.toISOString(),
    author: "", // Linear SDK comment doesn't expose author email directly here
    comment: c.body,
    topic_guid: topicId,
    modified_date: c.updatedAt?.toISOString(),
  }));

  return NextResponse.json(comments);
}

/**
 * BCF API 3.0 – POST /bcf/3.0/projects/{projectId}/topics/{topicId}/comments
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { topicId } = await params;
  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) return NextResponse.json({ message: "Linear not connected" }, { status: 503 });

  const body = await req.json();
  const result = await linear.createComment({
    issueId: topicId,
    body: body.comment ?? "",
  });

  const comment = await result.comment;
  return NextResponse.json(
    {
      guid: comment?.id,
      date: comment?.createdAt?.toISOString(),
      comment: comment?.body,
      topic_guid: topicId,
    },
    { status: 201 }
  );
}
