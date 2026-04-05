import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureOrganization, getUserOrganization } from "@/lib/organization";
import { z } from "zod";

/**
 * GET /api/organization
 * Returns the current user's organization with members count.
 */
export async function GET() {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) {
    // Auto-create organization for the user
    const newOrg = await ensureOrganization(user.id, user.email, user.name);
    const members = await prisma.membership.findMany({
      where: { organizationId: newOrg.id },
      include: { user: true },
    });
    return NextResponse.json({
      ...newOrg,
      role: "admin" as const,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
        createdAt: m.createdAt,
      })),
    });
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: org.id },
    include: { user: true },
  });

  const invitations = await prisma.invitation.findMany({
    where: { organizationId: org.id, status: "pending" },
  });

  return NextResponse.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: org.membership.role,
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      name: m.user.name,
      email: m.user.email,
      createdAt: m.createdAt,
    })),
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })),
  });
}

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100),
});

/**
 * PUT /api/organization
 * Update organization name (admin only).
 */
export async function PUT(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });
  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json(updated);
}
