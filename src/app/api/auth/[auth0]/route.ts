import { auth0 } from "@/lib/auth0";
import type { NextRequest } from "next/server";

// Auth0 v4 handles all auth routes via the middleware/proxy.
// This route handler provides a fallback for explicit /api/auth/* calls.
export async function GET(req: NextRequest) {
  return auth0.middleware(req);
}

export async function POST(req: NextRequest) {
  return auth0.middleware(req);
}
