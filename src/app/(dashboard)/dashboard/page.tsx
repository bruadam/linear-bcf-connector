import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, XCircle, Link2, Upload, RefreshCw, Settings } from "lucide-react";

async function getDashboardData(auth0Id: string) {
  const user = await prisma.user.findUnique({
    where: { auth0Id },
    include: {
      linearConnections: {
        include: { projectMappings: true },
      },
      bcfConfigs: true,
      appSettings: true,
    },
  });
  return user;
}

export default async function DashboardPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  const user = await getDashboardData(session.user.sub as string);
  const linearConnection = user?.linearConnections?.[0];
  const projectMapping = linearConnection?.projectMappings?.[0];
  const bcfConfig = user?.bcfConfigs?.[0];

  const bcfServerUrl =
    bcfConfig?.serverUrl ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.railway.app"}/api/bcf/3.0`;

  const topicCount = await prisma.bcfTopic.count();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name}. Here&apos;s your connector status.
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Linear Connection</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              {linearConnection ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  Not connected
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectMapping ? (
              <Badge variant="secondary">{projectMapping.linearTeamName}</Badge>
            ) : (
              <p className="text-xs text-muted-foreground">No team selected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>BCF Server</CardDescription>
            <CardTitle className="flex items-center gap-2 text-base">
              {bcfConfig ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Configured
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-yellow-500" />
                  Default URL
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground break-all">{bcfServerUrl}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Imported Topics</CardDescription>
            <CardTitle className="text-2xl font-bold">{topicCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">BCF topics in database</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/import">
              <Upload className="h-5 w-5" />
              <span>Import BCF</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link href="/sync">
              <RefreshCw className="h-5 w-5" />
              <span>Sync</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <a href="/api/auth/linear">
              <Link2 className="h-5 w-5" />
              <span>Connect Linear</span>
            </a>
          </Button>
        </div>
      </div>

      {/* BCF Live Connector Setup */}
      <Card>
        <CardHeader>
          <CardTitle>BCF Live Connector Setup</CardTitle>
          <CardDescription>
            Use these credentials to connect Solibri to this service via the BCF Live Connector.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">BCF Server URL</p>
            <code className="block rounded bg-muted px-3 py-2 text-sm break-all">
              {bcfServerUrl}
            </code>
          </div>
          {linearConnection && (
            <>
              <div>
                <p className="text-sm font-medium mb-1">Client ID (your user ID)</p>
                <code className="block rounded bg-muted px-3 py-2 text-sm break-all">
                  {user?.id}
                </code>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Client Secret (Linear access token)</p>
                <code className="block rounded bg-muted px-3 py-2 text-sm break-all">
                  {linearConnection.accessToken.slice(0, 8)}••••••••••••••••
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Full value available in Settings → BCF Credentials
                </p>
              </div>
            </>
          )}
          {!linearConnection && (
            <p className="text-sm text-muted-foreground">
              Connect your Linear account in Settings to get credentials.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
