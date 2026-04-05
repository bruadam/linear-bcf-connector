import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganization } from "@/lib/organization";
import { z } from "zod";

/**
 * GET /api/projects/[projectId]
 * Get a single project by ID.
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

  return NextResponse.json(project);
}

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  linearTeamId: z.string().optional().nullable(),
  linearTeamName: z.string().optional().nullable(),
  linearProjectId: z.string().optional().nullable(),
  linearProjectName: z.string().optional().nullable(),
  bcfServerUrl: z.string().optional().nullable(),
  bcfRemoteServerUrl: z.string().optional().nullable(),
  bcfRemoteClientId: z.string().optional().nullable(),
  bcfRemoteClientSecret: z.string().optional().nullable(),
});

/**
 * PUT /api/projects/[projectId]
 * Update a project (admin only).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });
  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.organizationId !== org.id) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/projects/[projectId]
 * Delete a project (admin only).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });
  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.organizationId !== org.id) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id: projectId } });

  return NextResponse.json({ success: true });
}
