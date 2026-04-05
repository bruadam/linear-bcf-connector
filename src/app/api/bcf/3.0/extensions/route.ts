import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { prisma } from "@/lib/prisma";

/**
 * BCF API 3.0 – GET /bcf/3.0/extensions
 * Returns the available topic statuses, types, priorities, labels, and users
 * sourced from the last-synced Linear workspace data.
 */
export async function GET(req: NextRequest) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const settings = await prisma.appSettings.findUnique({
    where: { userId: ctx.userId },
  });

  // Priority labels from stored settings (labels configured by user, synced from Linear priorities)
  const priorityLabels = Array.isArray(settings?.priorityLabels)
    ? settings.priorityLabels
    : [];
  const priorities: string[] =
    priorityLabels.length > 0
      ? (priorityLabels as { label: string }[]).map((p) => p.label)
      : ["No priority", "Urgent", "High", "Medium", "Low"];

  // Users from last sync
  const syncedUsers = Array.isArray(settings?.syncedUsers)
    ? settings.syncedUsers
    : [];
  const userIds: string[] = (syncedUsers as { email: string }[])
    .map((u) => u.email)
    .filter(Boolean);

  // Statuses from last sync
  const syncedStatuses = Array.isArray(settings?.syncedStatuses)
    ? settings.syncedStatuses
    : [];
  const topicStatuses: string[] =
    syncedStatuses.length > 0
      ? (syncedStatuses as { name: string }[]).map((s) => s.name)
      : ["Open", "In Progress", "Resolved", "Closed"];

  // Labels from last sync
  const syncedLabels = Array.isArray(settings?.syncedLabels)
    ? settings.syncedLabels
    : [];
  const topicLabels: string[] = (syncedLabels as { name: string }[]).map(
    (l) => l.name,
  );

  return NextResponse.json({
    topic_type: ["Clash", "Issue", "Request", "Fault", "Remark", "Unknown"],
    topic_status: topicStatuses,
    topic_label: topicLabels,
    snippet_type: [],
    priority: priorities,
    user_id_type: userIds,
  });
}
