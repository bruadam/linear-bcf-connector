"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Link2, Plus, Trash2, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface PriorityLabel {
  value: number;
  label: string;
  color: string;
}

interface Settings {
  linearConnected: boolean;
  linearOrgId?: string;
  linearUserId?: string;
  projectMapping?: {
    linearTeamId: string;
    linearTeamName: string;
    linearProjectId?: string;
    linearProjectName?: string;
  };
  bcfConfig?: {
    serverUrl: string;
    remoteServerUrl?: string;
    remoteClientId?: string;
  };
  appSettings?: {
    priorityLabels: PriorityLabel[];
    syncUsers: boolean;
    syncStatuses: boolean;
    syncLabels: boolean;
  };
  bcfClientId?: string;
  bcfClientSecret?: string;
}

interface Team {
  id: string;
  name: string;
}

const DEFAULT_PRIORITY_LABELS: PriorityLabel[] = [
  { value: 0, label: "No priority", color: "#95A5A6" },
  { value: 1, label: "Urgent", color: "#E74C3C" },
  { value: 2, label: "High", color: "#E67E22" },
  { value: 3, label: "Medium", color: "#F1C40F" },
  { value: 4, label: "Low", color: "#3498DB" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [remoteServerUrl, setRemoteServerUrl] = useState("");
  const [remoteClientId, setRemoteClientId] = useState("");
  const [remoteClientSecret, setRemoteClientSecret] = useState("");
  const [priorityLabels, setPriorityLabels] = useState<PriorityLabel[]>(DEFAULT_PRIORITY_LABELS);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "linear") setMessage("✅ Linear account connected successfully!");
    if (error) setMessage(`❌ Error: ${error}`);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data: Settings = await res.json();
        setSettings(data);
        setServerUrl(data.bcfConfig?.serverUrl ?? "");
        setRemoteServerUrl(data.bcfConfig?.remoteServerUrl ?? "");
        setRemoteClientId(data.bcfConfig?.remoteClientId ?? "");
        setSelectedTeamId(data.projectMapping?.linearTeamId ?? "");
        setSelectedTeamName(data.projectMapping?.linearTeamName ?? "");
        setPriorityLabels(
          data.appSettings?.priorityLabels?.length
            ? (data.appSettings.priorityLabels as PriorityLabel[])
            : DEFAULT_PRIORITY_LABELS
        );

        // Fetch teams if connected
        if (data.linearConnected) {
          const syncRes = await fetch("/api/sync");
          // We don't use sync data for the team list; use BCF projects endpoint
          // as a proxy to get teams
          const bcfRes = await fetch("/api/bcf/3.0/projects", {
            headers: { Authorization: `Bearer ${data.bcfClientSecret}` },
          });
          if (bcfRes.ok) {
            const projects = await bcfRes.json();
            setTeams(projects.map((p: { project_id: string; name: string }) => ({ id: p.project_id, name: p.name })));
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linearTeamId: selectedTeamId || undefined,
          linearTeamName: selectedTeamName || undefined,
          serverUrl: serverUrl || undefined,
          remoteServerUrl: remoteServerUrl || undefined,
          remoteClientId: remoteClientId || undefined,
          remoteClientSecret: remoteClientSecret || undefined,
          priorityLabels,
        }),
      });
      if (res.ok) {
        setMessage("✅ Settings saved successfully");
      } else {
        const err = await res.json();
        setMessage(`❌ ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your Linear connection, BCF server, and sync preferences.
        </p>
      </div>

      {message && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm">{message}</div>
      )}

      <Tabs defaultValue="linear">
        <TabsList className="mb-6">
          <TabsTrigger value="linear">Linear</TabsTrigger>
          <TabsTrigger value="bcf">BCF Server</TabsTrigger>
          <TabsTrigger value="priorities">Priority Labels</TabsTrigger>
          <TabsTrigger value="credentials">BCF Credentials</TabsTrigger>
        </TabsList>

        {/* ── Linear tab ── */}
        <TabsContent value="linear" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linear Account</CardTitle>
              <CardDescription>Connect your Linear workspace to sync issues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {settings?.linearConnected ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Connected</span>
                    <Badge variant="secondary">Org: {settings.linearOrgId?.slice(0, 8)}…</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span>Not connected</span>
                  </>
                )}
              </div>
              <a href="/auth/linear">
                <Button variant={settings?.linearConnected ? "outline" : "default"}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {settings?.linearConnected ? "Reconnect Linear" : "Connect Linear"}
                </Button>
              </a>
            </CardContent>
          </Card>

          {settings?.linearConnected && (
            <Card>
              <CardHeader>
                <CardTitle>Team & Project</CardTitle>
                <CardDescription>
                  Select which Linear team (and optional project) BCF topics will be imported into.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-select">Team</Label>
                  <select
                    id="team-select"
                    value={selectedTeamId}
                    onChange={(e) => {
                      const selected = teams.find((t) => t.id === e.target.value);
                      setSelectedTeamId(e.target.value);
                      setSelectedTeamName(selected?.name ?? "");
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a team…</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedTeamId && (
                  <p className="text-xs text-muted-foreground">Selected: {selectedTeamName}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── BCF Server tab ── */}
        <TabsContent value="bcf" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>This Service&apos;s BCF URL</CardTitle>
              <CardDescription>
                The BCF API base URL Solibri should connect to. Auto-filled from your deployment URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="server-url">BCF Server URL</Label>
              <Input
                id="server-url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-app.railway.app/api/bcf/3.0"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remote BCF Server (Solibri Push)</CardTitle>
              <CardDescription>
                Optional: if you want this service to also act as a BCF client and push topics
                to a Solibri-hosted BCF server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remote-url">Remote Server URL</Label>
                <Input
                  id="remote-url"
                  value={remoteServerUrl}
                  onChange={(e) => setRemoteServerUrl(e.target.value)}
                  placeholder="https://solibri-bcf-server.example.com/bcf/3.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-client-id">Client ID</Label>
                <Input
                  id="remote-client-id"
                  value={remoteClientId}
                  onChange={(e) => setRemoteClientId(e.target.value)}
                  placeholder="client_id from Solibri OAuth app"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-client-secret">Client Secret</Label>
                <Input
                  id="remote-client-secret"
                  type="password"
                  value={remoteClientSecret}
                  onChange={(e) => setRemoteClientSecret(e.target.value)}
                  placeholder="client_secret from Solibri OAuth app"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Priority Labels tab ── */}
        <TabsContent value="priorities">
          <Card>
            <CardHeader>
              <CardTitle>Priority Labels</CardTitle>
              <CardDescription>
                Map Linear priority levels to display labels and colours for BCF topics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {priorityLabels.map((pl, idx) => (
                <div key={pl.value} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={pl.color}
                    onChange={(e) => {
                      const updated = [...priorityLabels];
                      updated[idx] = { ...pl, color: e.target.value };
                      setPriorityLabels(updated);
                    }}
                    className="h-9 w-12 rounded border cursor-pointer"
                    title="Pick colour"
                  />
                  <Input
                    value={pl.label}
                    onChange={(e) => {
                      const updated = [...priorityLabels];
                      updated[idx] = { ...pl, label: e.target.value };
                      setPriorityLabels(updated);
                    }}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="shrink-0">
                    Level {pl.value}
                  </Badge>
                  {idx >= 5 && (
                    <button
                      onClick={() => setPriorityLabels(priorityLabels.filter((_, i) => i !== idx))}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPriorityLabels([
                    ...priorityLabels,
                    { value: priorityLabels.length, label: "Custom", color: "#888888" },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add level
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BCF Credentials tab ── */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>BCF Credentials for Solibri</CardTitle>
              <CardDescription>
                Use these credentials when setting up the BCF Live Connector in Solibri. The token
                endpoint is{" "}
                <code className="text-xs">{serverUrl || "…"}/auth/token</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Client ID</Label>
                <Input readOnly value={settings?.bcfClientId ?? "Connect Linear first"} />
              </div>
              <div>
                <Label>Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    type={showSecret ? "text" : "password"}
                    value={settings?.bcfClientSecret ?? "Connect Linear first"}
                  />
                  <Button variant="outline" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep your client secret private. These credentials authenticate Solibri to this
                service.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
