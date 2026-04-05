import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureOrganization, getUserOrganization } from "@/lib/organization";
import { z } from "zod";

/**
 * GET /api/projects
 * List all projects in the user's organization.
 */
export async function GET() {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let org = await getUserOrganization(user.id);
  if (!org) {
    await ensureOrganization(user.id, user.email, user.name);
    org = await getUserOrganization(user.id);
  }
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

/**
 * POST /api/projects
 * Create a new project in the user's organization (admin only).
 */
export async function POST(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let org = await getUserOrganization(user.id);
  if (!org) {
    await ensureOrganization(user.id, user.email, user.name);
    org = await getUserOrganization(user.id);
  }
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });

  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      organizationId: org.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
