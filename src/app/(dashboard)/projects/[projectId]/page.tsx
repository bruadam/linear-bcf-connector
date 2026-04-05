"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Trash2,
  Link2,
  Server,
  Users,
  RefreshCw,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  linearTeamId: string | null;
  linearTeamName: string | null;
  linearProjectId: string | null;
  linearProjectName: string | null;
  bcfServerUrl: string | null;
  bcfRemoteServerUrl: string | null;
  bcfRemoteClientId: string | null;
  bcfRemoteClientSecret: string | null;
}

interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

interface LinearProject {
  id: string;
  name: string;
  state: string;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  active: boolean;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Linear connection state
  const [linearTeams, setLinearTeams] = useState<LinearTeam[]>([]);
  const [linearProjects, setLinearProjects] = useState<LinearProject[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Assignees
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  // BCF config
  const [bcfServerUrl, setBcfServerUrl] = useState("");
  const [bcfRemoteServerUrl, setBcfRemoteServerUrl] = useState("");
  const [bcfRemoteClientId, setBcfRemoteClientId] = useState("");
  const [bcfRemoteClientSecret, setBcfRemoteClientSecret] = useState("");

  // Project info
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const loadAssignees = useCallback(async () => {
    setLoadingAssignees(true);
    const res = await fetch(`/api/projects/${projectId}/assignees`);
    if (res.ok) {
      const data = await res.json();
      setAssignees(data.assignees ?? []);
    }
    setLoadingAssignees(false);
  }, [projectId]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        router.push("/projects");
        return;
      }
      const data: Project = await res.json();
      setProject(data);
      setProjectName(data.name);
      setProjectDescription(data.description ?? "");
      setSelectedTeamId(data.linearTeamId ?? "");
      setSelectedTeamName(data.linearTeamName ?? "");
      setSelectedProjectId(data.linearProjectId ?? "");
      setSelectedProjectName(data.linearProjectName ?? "");
      setBcfServerUrl(data.bcfServerUrl ?? "");
      setBcfRemoteServerUrl(data.bcfRemoteServerUrl ?? "");
      setBcfRemoteClientId(data.bcfRemoteClientId ?? "");
      setBcfRemoteClientSecret(data.bcfRemoteClientSecret ?? "");
      setLoading(false);

      // Load Linear teams
      setLoadingTeams(true);
      const teamsRes = await fetch("/api/linear/teams");
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setLinearTeams(teamsData.teams ?? []);
      }
      setLoadingTeams(false);

      // Load assignees if team linked
      if (data.linearTeamId) {
        loadAssignees();
      }
    }
    load();
  }, [projectId, router, loadAssignees]);

  // Load Linear projects when team changes
  useEffect(() => {
    if (!selectedTeamId) {
      setLinearProjects([]);
      return;
    }
    async function loadLinearProjects() {
      setLoadingProjects(true);
      const res = await fetch(`/api/linear/projects?teamId=${selectedTeamId}`);
      if (res.ok) {
        const data = await res.json();
        setLinearProjects(data.projects ?? []);
      }
      setLoadingProjects(false);
    }
    loadLinearProjects();
  }, [selectedTeamId]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        description: projectDescription || null,
        linearTeamId: selectedTeamId || null,
        linearTeamName: selectedTeamName || null,
        linearProjectId: selectedProjectId || null,
        linearProjectName: selectedProjectName || null,
        bcfServerUrl: bcfServerUrl || null,
        bcfRemoteServerUrl: bcfRemoteServerUrl || null,
        bcfRemoteClientId: bcfRemoteClientId || null,
        bcfRemoteClientSecret: bcfRemoteClientSecret || null,
      }),
    });
    if (res.ok) {
      setMessage("Settings saved successfully");
      // Reload assignees if team changed
      if (selectedTeamId) loadAssignees();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  }

  async function deleteProject() {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/projects");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{project?.name}</h1>
          {project?.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Project</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{project?.name}&quot;? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteProject}>
                Delete Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm">{message}</div>
      )}

      <Tabs defaultValue="linear">
        <TabsList>
          <TabsTrigger value="linear">
            <Link2 className="mr-2 h-4 w-4" />
            Linear
          </TabsTrigger>
          <TabsTrigger value="assignees">
            <Users className="mr-2 h-4 w-4" />
            Assignees
          </TabsTrigger>
          <TabsTrigger value="bcf">
            <Server className="mr-2 h-4 w-4" />
            BCF Server
          </TabsTrigger>
        </TabsList>

        {/* ── Linear Connection Tab ── */}
        <TabsContent value="linear" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Description</Label>
                <Input
                  id="project-desc"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linear Team</CardTitle>
              <CardDescription>
                Select which Linear team this project maps to. Issues and
                assignees will come from this team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linear-team">Team</Label>
                <select
                  id="linear-team"
                  value={selectedTeamId}
                  onChange={(e) => {
                    const team = linearTeams.find((t) => t.id === e.target.value);
                    setSelectedTeamId(e.target.value);
                    setSelectedTeamName(team?.name ?? "");
                    setSelectedProjectId("");
                    setSelectedProjectName("");
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  disabled={loadingTeams}
                >
                  <option value="">
                    {loadingTeams ? "Loading teams..." : "Select a team..."}
                  </option>
                  {linearTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.key})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeamId && (
                <div className="space-y-2">
                  <Label htmlFor="linear-project">Project (optional)</Label>
                  <select
                    id="linear-project"
                    value={selectedProjectId}
                    onChange={(e) => {
                      const proj = linearProjects.find(
                        (p) => p.id === e.target.value
                      );
                      setSelectedProjectId(e.target.value);
                      setSelectedProjectName(proj?.name ?? "");
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    disabled={loadingProjects}
                  >
                    <option value="">
                      {loadingProjects
                        ? "Loading projects..."
                        : "All issues (no project filter)"}
                    </option>
                    {linearProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Optionally filter to a specific Linear project within the
                    team.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Assignees Tab ── */}
        <TabsContent value="assignees" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Assignees</CardTitle>
                  <CardDescription>
                    {selectedTeamName
                      ? `Members of the "${selectedTeamName}" Linear team who can be assigned to issues.`
                      : "Link a Linear team to see assignees."}
                  </CardDescription>
                </div>
                {selectedTeamId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAssignees}
                    disabled={loadingAssignees}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${loadingAssignees ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTeamId ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Select a Linear team in the Linear tab first, then save to load
                  assignees.
                </p>
              ) : loadingAssignees ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading assignees...
                </p>
              ) : assignees.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No team members found.
                </p>
              ) : (
                <div className="space-y-3">
                  {assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-3 rounded-lg border px-4 py-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {assignee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {assignee.displayName || assignee.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {assignee.email}
                        </p>
                      </div>
                      <Badge
                        variant={assignee.active ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {assignee.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BCF Server Tab ── */}
        <TabsContent value="bcf" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>BCF Server URL</CardTitle>
              <CardDescription>
                The BCF API endpoint that Solibri or other BCF clients should
                connect to for this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="bcf-url">BCF Server URL</Label>
              <Input
                id="bcf-url"
                value={bcfServerUrl}
                onChange={(e) => setBcfServerUrl(e.target.value)}
                placeholder="https://your-app.railway.app/api/bcf/3.0"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remote BCF Server</CardTitle>
              <CardDescription>
                Optional: configure a remote BCF server (e.g. Solibri) that this
                project pushes/pulls topics from.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remote-url">Remote Server URL</Label>
                <Input
                  id="remote-url"
                  value={bcfRemoteServerUrl}
                  onChange={(e) => setBcfRemoteServerUrl(e.target.value)}
                  placeholder="https://solibri-bcf-server.example.com/bcf/3.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-cid">Client ID</Label>
                <Input
                  id="remote-cid"
                  value={bcfRemoteClientId}
                  onChange={(e) => setBcfRemoteClientId(e.target.value)}
                  placeholder="Client ID from remote BCF server"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-cs">Client Secret</Label>
                <Input
                  id="remote-cs"
                  type="password"
                  value={bcfRemoteClientSecret}
                  onChange={(e) => setBcfRemoteClientSecret(e.target.value)}
                  placeholder="Client Secret from remote BCF server"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
