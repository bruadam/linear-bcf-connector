import { LinearClient } from "@linear/sdk";
import { prisma } from "./prisma";

export async function getLinearClientForUser(userId: string): Promise<LinearClient | null> {
  const connection = await prisma.linearConnection.findUnique({
    where: { userId },
  });
  if (!connection) return null;
  return new LinearClient({ accessToken: connection.accessToken });
}

export async function exchangeLinearCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const params = new URLSearchParams({
    code,
    redirect_uri: process.env.LINEAR_REDIRECT_URI!,
    client_id: process.env.LINEAR_CLIENT_ID!,
    client_secret: process.env.LINEAR_CLIENT_SECRET!,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear token exchange failed: ${text}`);
  }

  return res.json();
}

export function getLinearAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.LINEAR_CLIENT_ID!,
    redirect_uri: process.env.LINEAR_REDIRECT_URI!,
    response_type: "code",
    scope: "read,write,issues:create,comments:create",
    state,
    actor: "application",
    prompt: "consent",
  });
  return `https://linear.app/oauth/authorize?${params.toString()}`;
}

// Map Linear priority number to BCF priority string
export function linearPriorityToBcf(priority: number): string {
  const map: Record<number, string> = {
    0: "Normal",
    1: "Urgent",
    2: "High",
    3: "Medium",
    4: "Low",
  };
  return map[priority] ?? "Normal";
}

// Map BCF priority string to Linear priority number
export function bcfPriorityToLinear(priority: string | null | undefined): number {
  const map: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
    normal: 3,
  };
  return map[(priority ?? "").toLowerCase()] ?? 0;
}
