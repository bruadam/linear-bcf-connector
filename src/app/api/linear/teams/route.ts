import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { getLinearClientForUser } from "@/lib/linear";

/**
 * GET /api/linear/teams
 * List all Linear teams the current user has access to.
 */
export async function GET() {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const linear = await getLinearClientForUser(user.id);
  if (!linear) {
    return NextResponse.json({ message: "Linear not connected", teams: [] }, { status: 200 });
  }

  const teamsConnection = await linear.teams();
  const teams = teamsConnection.nodes.map((t) => ({
    id: t.id,
    name: t.name,
    key: t.key,
  }));

  return NextResponse.json({ teams });
}
