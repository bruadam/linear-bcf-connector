import { NextRequest, NextResponse } from "next/server";
import { bcfAuth, isNextResponse } from "@/lib/bcf-auth";
import { getLinearClientForUser } from "@/lib/linear";

/**
 * BCF API 3.0 – GET /bcf/3.0/current-user
 * Returns info about the authenticated user.
 */
export async function GET(req: NextRequest) {
  const ctx = await bcfAuth(req);
  if (isNextResponse(ctx)) return ctx;

  const linear = await getLinearClientForUser(ctx.userId);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected" }, { status: 503 });
  }

  const viewer = await linear.viewer;

  return NextResponse.json({
    id: viewer.id,
    name: viewer.name,
    id_server: ctx.userId,
  });
}
