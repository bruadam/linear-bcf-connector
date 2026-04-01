import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { getLinearClientForUser, bcfPriorityToLinear } from "@/lib/linear";
import { parseBcfZip } from "@/lib/bcf";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/import-bcf
 * Accepts a multipart form upload of a BCF ZIP file.
 * Parses topics and creates Linear issues.
 */
export async function POST(req: NextRequest) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.linearConnection.findUnique({
    where: { userId: user.id },
    include: { projectMappings: true },
  });

  if (!connection) {
    return NextResponse.json(
      { message: "Linear not connected. Please connect your Linear account first." },
      { status: 400 }
    );
  }

  const projectMapping = connection.projectMappings?.[0];
  if (!projectMapping) {
    return NextResponse.json(
      { message: "No project mapping configured. Please configure a target team in Settings." },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const topics = await parseBcfZip(buffer);

  if (topics.length === 0) {
    return NextResponse.json({ message: "No topics found in BCF file", imported: 0 });
  }

  const linear = await getLinearClientForUser(user.id);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 503 });
  }

  const results: { bcfGuid: string; linearIssueId: string; title: string }[] = [];
  const errors: { bcfGuid: string; error: string }[] = [];

  for (const topic of topics) {
    try {
      const result = await linear.createIssue({
        teamId: projectMapping.linearTeamId,
        projectId: projectMapping.linearProjectId ?? undefined,
        title: topic.title,
        description: topic.description ?? "",
        priority: bcfPriorityToLinear(topic.priority),
        dueDate: topic.dueDate ? new Date(topic.dueDate).toISOString() : undefined,
      });

      const issue = await result.issue;
      if (!issue) throw new Error("Issue creation returned null");

      // Persist the mapping
      await prisma.bcfTopic.upsert({
        where: { bcfGuid: topic.guid },
        update: {
          title: topic.title,
          description: topic.description,
          status: topic.status,
          priority: topic.priority,
          assignedTo: topic.assignedTo,
          linearIssueId: issue.id,
          linearIssueUrl: issue.url,
          rawPayload: JSON.parse(JSON.stringify(topic)),
        },
        create: {
          bcfGuid: topic.guid,
          title: topic.title,
          description: topic.description,
          status: topic.status,
          priority: topic.priority,
          assignedTo: topic.assignedTo,
          dueDate: topic.dueDate ? new Date(topic.dueDate) : undefined,
          creationDate: topic.creationDate ? new Date(topic.creationDate) : undefined,
          linearIssueId: issue.id,
          linearIssueUrl: issue.url,
          rawPayload: JSON.parse(JSON.stringify(topic)),
        },
      });

      results.push({ bcfGuid: topic.guid, linearIssueId: issue.id, title: topic.title });
    } catch (err) {
      errors.push({ bcfGuid: topic.guid, error: String(err) });
    }
  }

  return NextResponse.json({
    imported: results.length,
    failed: errors.length,
    results,
    errors,
  });
}
