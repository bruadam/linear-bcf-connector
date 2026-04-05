import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganization } from "@/lib/organization";
import { z } from "zod";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

/**
 * POST /api/organization/invitations
 * Create an invitation to join the organization (admin only).
 */
export async function POST(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });
  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
  }

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId: org.id,
        },
      },
    });
    if (existingMembership) {
      return NextResponse.json(
        { message: "User is already a member" },
        { status: 400 }
      );
    }
  }

  // Check for existing pending invitation
  const existingInvite = await prisma.invitation.findFirst({
    where: {
      email: parsed.data.email,
      organizationId: org.id,
      status: "pending",
    },
  });
  if (existingInvite) {
    return NextResponse.json(
      { message: "Invitation already pending for this email" },
      { status: 400 }
    );
  }

  const invitation = await prisma.invitation.create({
    data: {
      email: parsed.data.email,
      organizationId: org.id,
      role: parsed.data.role,
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // If the user already exists in the system, auto-accept the invitation
  if (existingUser) {
    await prisma.membership.create({
      data: {
        userId: existingUser.id,
        organizationId: org.id,
        role: parsed.data.role,
      },
    });
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" },
    });
    return NextResponse.json({ ...invitation, status: "accepted", autoAccepted: true });
  }

  return NextResponse.json(invitation);
}

/**
 * DELETE /api/organization/invitations
 * Revoke a pending invitation (admin only).
 */
export async function DELETE(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });
  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { invitationId } = body;

  if (!invitationId) {
    return NextResponse.json({ message: "invitationId required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });
  if (!invitation || invitation.organizationId !== org.id) {
    return NextResponse.json({ message: "Invitation not found" }, { status: 404 });
  }

  await prisma.invitation.delete({ where: { id: invitationId } });
  return NextResponse.json({ success: true });
}
