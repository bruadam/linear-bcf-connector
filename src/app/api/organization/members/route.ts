import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserOrganization } from "@/lib/organization";
import { z } from "zod";

const UpdateMemberSchema = z.object({
  memberId: z.string(),
  role: z.enum(["admin", "member"]),
});

/**
 * PATCH /api/organization/members
 * Update a member's role (admin only).
 */
export async function PATCH(req: NextRequest) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const org = await getUserOrganization(user.id);
  if (!org) return NextResponse.json({ message: "No organization" }, { status: 404 });
  if (org.membership.role !== "admin") {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  // Prevent demoting yourself if you're the last admin
  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.memberId },
  });

  if (!membership || membership.organizationId !== org.id) {
    return NextResponse.json({ message: "Member not found" }, { status: 404 });
  }

  if (membership.userId === user.id && parsed.data.role === "member") {
    const adminCount = await prisma.membership.count({
      where: { organizationId: org.id, role: "admin" },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { message: "Cannot remove the last admin" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.membership.update({
    where: { id: parsed.data.memberId },
    data: { role: parsed.data.role },
  });

  return NextResponse.json(updated);
}

const RemoveMemberSchema = z.object({
  memberId: z.string(),
});

/**
 * DELETE /api/organization/members
 * Remove a member from the organization (admin only).
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
  const parsed = RemoveMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.memberId },
  });

  if (!membership || membership.organizationId !== org.id) {
    return NextResponse.json({ message: "Member not found" }, { status: 404 });
  }

  // Cannot remove yourself
  if (membership.userId === user.id) {
    return NextResponse.json(
      { message: "Cannot remove yourself" },
      { status: 400 }
    );
  }

  await prisma.membership.delete({ where: { id: parsed.data.memberId } });

  return NextResponse.json({ success: true });
}
