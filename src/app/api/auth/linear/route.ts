import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/auth";
import { getLinearAuthUrl } from "@/lib/linear";

export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", process.env.AUTH0_BASE_URL!));
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
  const url = getLinearAuthUrl(state);
  return NextResponse.redirect(url);
}
