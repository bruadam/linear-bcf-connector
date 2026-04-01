import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { getLinearClientForUser } from "@/lib/linear";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SettingsSchema = z.object({
  linearTeamId: z.string().optional(),
  linearTeamName: z.string().optional(),
  linearProjectId: z.string().optional(),
  linearProjectName: z.string().optional(),
  serverUrl: z.string().url().optional(),
  remoteServerUrl: z.string().url().optional(),
  remoteClientId: z.string().optional(),
  remoteClientSecret: z.string().optional(),
  priorityLabels: z.array(z.object({
    value: z.number(),
    label: z.string(),
    color: z.string(),
  })).optional(),
  syncUsers: z.boolean().optional(),
  syncStatuses: z.boolean().optional(),
  syncLabels: z.boolean().optional(),
});

/**
 * GET /api/settings
 * Returns the current user's settings.
 */
export async function GET() {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [connection, bcfConfig, appSettings] = await Promise.all([
    prisma.linearConnection.findUnique({
      where: { userId: user.id },
      include: { projectMappings: true },
    }),
    prisma.bcfServerConfig.findFirst({ where: { userId: user.id } }),
    prisma.appSettings.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    linearConnected: !!connection,
    linearOrgId: connection?.linearOrgId,
    linearUserId: connection?.linearUserId,
    projectMapping: connection?.projectMappings?.[0] ?? null,
    bcfConfig,
    appSettings,
    // Expose client credentials for BCF live connector setup in Solibri
    bcfClientId: connection ? user.id : null,
    bcfClientSecret: connection?.accessToken ?? null,
  });
}

/**
 * POST /api/settings
 * Save/update the user's settings.
 */
export async function POST(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Update project mapping if team info provided
  if (data.linearTeamId) {
    const connection = await prisma.linearConnection.findUnique({
      where: { userId: user.id },
    });
    if (connection) {
      await prisma.projectMapping.upsert({
        where: { linearConnectionId: connection.id },
        update: {
          linearTeamId: data.linearTeamId,
          linearTeamName: data.linearTeamName ?? "",
          linearProjectId: data.linearProjectId ?? null,
          linearProjectName: data.linearProjectName ?? null,
        },
        create: {
          linearConnectionId: connection.id,
          linearTeamId: data.linearTeamId,
          linearTeamName: data.linearTeamName ?? "",
          linearProjectId: data.linearProjectId ?? null,
          linearProjectName: data.linearProjectName ?? null,
        },
      });
    }
  }

  // Update BCF server config
  if (data.serverUrl || data.remoteServerUrl) {
    await prisma.bcfServerConfig.upsert({
      where: { userId: user.id },
      update: {
        serverUrl: data.serverUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/bcf/3.0`,
        remoteServerUrl: data.remoteServerUrl ?? null,
        remoteClientId: data.remoteClientId ?? null,
        remoteClientSecret: data.remoteClientSecret ?? null,
      },
      create: {
        userId: user.id,
        serverUrl: data.serverUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/api/bcf/3.0`,
        remoteServerUrl: data.remoteServerUrl ?? null,
        remoteClientId: data.remoteClientId ?? null,
        remoteClientSecret: data.remoteClientSecret ?? null,
      },
    });
  }

  // Update app settings
  if (data.priorityLabels !== undefined || data.syncUsers !== undefined) {
    await prisma.appSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(data.priorityLabels !== undefined && { priorityLabels: data.priorityLabels }),
        ...(data.syncUsers !== undefined && { syncUsers: data.syncUsers }),
        ...(data.syncStatuses !== undefined && { syncStatuses: data.syncStatuses }),
        ...(data.syncLabels !== undefined && { syncLabels: data.syncLabels }),
      },
      create: {
        userId: user.id,
        priorityLabels: data.priorityLabels ?? [],
        syncUsers: data.syncUsers ?? true,
        syncStatuses: data.syncStatuses ?? true,
        syncLabels: data.syncLabels ?? true,
      },
    });
  }

  return NextResponse.json({ success: true });
}
