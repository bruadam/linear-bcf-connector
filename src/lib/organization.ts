import { prisma } from "./prisma";
import type { Organization, Membership, MemberRole } from "@prisma/client";

/**
 * Get the user's organization (first one they belong to).
 * Returns null if the user has no organization.
 */
export async function getUserOrganization(
  userId: string
): Promise<(Organization & { membership: Membership }) | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
  });
  if (!membership) return null;
  return { ...membership.organization, membership };
}

/**
 * Ensure the user has an organization. Creates one if they don't.
 */
export async function ensureOrganization(
  userId: string,
  userEmail: string,
  userName?: string | null
): Promise<Organization> {
  const existing = await getUserOrganization(userId);
  if (existing) return existing;

  // Auto-create an org from the user's email domain
  const domain = userEmail.split("@")[1] ?? "default";
  const slug = domain.replace(/\./g, "-") + "-" + Date.now();

  const org = await prisma.organization.create({
    data: {
      name: userName ? `${userName}'s Organization` : `${domain} Organization`,
      slug,
      memberships: {
        create: {
          userId,
          role: "admin",
        },
      },
    },
  });

  return org;
}

/**
 * Check if a user is an admin of the given organization.
 */
export async function isOrgAdmin(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  return membership?.role === "admin";
}

/**
 * Get all members of an organization with their user details.
 */
export async function getOrgMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}
