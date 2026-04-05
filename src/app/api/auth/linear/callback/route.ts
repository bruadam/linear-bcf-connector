import { NextRequest, NextResponse } from "next/server";
import { exchangeLinearCode } from "@/lib/linear";
import { prisma } from "@/lib/prisma";
import { LinearClient } from "@linear/sdk";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl =
    process.env.AUTH0_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error)}`, appUrl),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?error=missing_params", appUrl),
    );
  }

  let userId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    );
    userId = decoded.userId;
  } catch {
    return NextResponse.redirect(
      new URL("/settings?error=invalid_state", appUrl),
    );
  }

  try {
    const tokenData = await exchangeLinearCode(code);
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Fetch Linear user & org info
    const linearClient = new LinearClient({
      accessToken: tokenData.access_token,
    });
    const viewer = await linearClient.viewer;
    const org = await linearClient.organization;

    await prisma.linearConnection.upsert({
      where: { userId },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        linearOrgId: org.id,
        linearUserId: viewer.id,
      },
      create: {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        linearOrgId: org.id,
        linearUserId: viewer.id,
      },
    });

    return NextResponse.redirect(new URL("/settings?connected=linear", appUrl));
  } catch (err) {
    console.error("Linear OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=oauth_failed", appUrl),
    );
  }
}
