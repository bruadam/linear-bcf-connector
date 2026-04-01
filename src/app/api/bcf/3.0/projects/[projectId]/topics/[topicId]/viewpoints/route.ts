import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { prisma } from "@/lib/prisma";
import { generateBcfGuid } from "@/lib/utils";

type Params = { params: Promise<{ projectId: string; topicId: string }> };

/**
 * BCF API 3.0 – GET /bcf/3.0/projects/{projectId}/topics/{topicId}/viewpoints
 * Returns stored viewpoints for a topic.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  // Viewpoints are stored as part of the BcfTopic rawPayload
  const { topicId } = await params;
  const topic = await prisma.bcfTopic.findFirst({
    where: { linearIssueId: topicId },
  });

  if (!topic?.rawPayload) {
    return NextResponse.json([]);
  }

  const payload = topic.rawPayload as { viewpoints?: unknown[] };
  return NextResponse.json(payload.viewpoints ?? []);
}

/**
 * BCF API 3.0 – POST /bcf/3.0/projects/{projectId}/topics/{topicId}/viewpoints
 * Store a viewpoint for a topic.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const { topicId } = await params;
  const body = await req.json();
  const vpGuid = body.guid ?? generateBcfGuid();

  const topic = await prisma.bcfTopic.findFirst({
    where: { linearIssueId: topicId },
  });

  const existing = (topic?.rawPayload as { viewpoints?: unknown[] } | null) ?? {};
  const viewpoints = [
    ...((existing.viewpoints as unknown[]) ?? []),
    { ...body, guid: vpGuid },
  ];

  if (topic) {
    await prisma.bcfTopic.update({
      where: { id: topic.id },
      data: { rawPayload: { ...existing, viewpoints } },
    });
  }

  return NextResponse.json({ guid: vpGuid }, { status: 201 });
}
