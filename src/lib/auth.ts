import { auth0 } from "./auth0";
import { prisma } from "./prisma";
import type { User } from "@prisma/client";

/**
 * Get the Auth0 session and resolve (or create) the corresponding DB user.
 * Returns null if the user is not authenticated.
 */
export async function getDbUser(): Promise<User | null> {
  const session = await auth0.getSession();
  if (!session?.user) return null;

  const auth0Id = session.user.sub as string;
  const email = session.user.email as string;
  const name = (session.user.name as string) ?? undefined;

  const user = await prisma.user.upsert({
    where: { auth0Id },
    update: { email, name },
    create: { auth0Id, email, name },
  });

  return user;
}
