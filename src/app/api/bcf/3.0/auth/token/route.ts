import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * BCF API 3.0 – OAuth2 token endpoint.
 *
 * Solibri uses client_credentials or authorization_code flow.
 * We issue a simple opaque bearer token backed by the user's Linear access token.
 *
 * In a production system this would be a full OAuth 2.0 authorisation server.
 * Here we keep it simple: the "client_id" is the user's userId and the
 * "client_secret" is the user's Linear access token (shown in the settings UI).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  const grantType = params.get("grant_type");
  const clientId = params.get("client_id");
  const clientSecret = params.get("client_secret");

  if (grantType !== "client_credentials") {
    return NextResponse.json(
      { error: "unsupported_grant_type" },
      { status: 400 }
    );
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400 }
    );
  }

  // Validate: look up the Linear connection where accessToken == clientSecret
  // and the userId == clientId
  const connection = await prisma.linearConnection.findFirst({
    where: { userId: clientId, accessToken: clientSecret },
  });

  if (!connection) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  // Return the access token (the Linear token itself serves as the bearer token)
  return NextResponse.json({
    access_token: clientSecret,
    token_type: "bearer",
    expires_in: 3600,
  });
}
