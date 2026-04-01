import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LinearConnection, ProjectMapping, BcfServerConfig } from "@prisma/client";

export type BcfAuthContext = {
  userId: string;
  connection: LinearConnection;
  projectMapping: ProjectMapping | null;
  bcfConfig: BcfServerConfig | null;
};

/**
 * Extract and validate Bearer token from BCF API requests.
 * Returns the auth context or a 401 response.
 */
export async function bcfAuth(
  req: NextRequest
): Promise<BcfAuthContext | NextResponse> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.linearConnection.findFirst({
    where: { accessToken: token },
    include: {
      projectMappings: true,
    },
  });

  if (!connection) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const projectMapping =
    (connection as LinearConnection & { projectMappings: ProjectMapping[] })
      .projectMappings?.[0] ?? null;

  const bcfConfig = await prisma.bcfServerConfig.findFirst({
    where: { userId: connection.userId },
  });

  return {
    userId: connection.userId,
    connection,
    projectMapping,
    bcfConfig,
  };
}

export function isNextResponse(val: unknown): val is NextResponse {
  return val instanceof NextResponse;
}
