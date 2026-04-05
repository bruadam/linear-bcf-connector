"use client";

import { useEffect, useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  MoreVertical,
  Shield,
  User,
  Trash2,
  Mail,
  Clock,
  XCircle,
} from "lucide-react";

interface Member {
  id: string;
  userId: string;
  role: "admin" | "member";
  name: string | null;
  email: string;
  createdAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  role: "admin" | "member";
  members: Member[];
  invitations: PendingInvitation[];
}

export default function TeamPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  // Org name edit
  const [editingName, setEditingName] = useState(false);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    const res = await fetch("/api/organization");
    if (res.ok) {
      const data: OrgData = await res.json();
      setOrg(data);
      setOrgName(data.name);
    }
    setLoading(false);
  }

  async function invite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    const res = await fetch("/api/organization/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setInviteEmail("");
      setInviteRole("member");
      setInviteOpen(false);
      if (data.autoAccepted) {
        setMessage(`${inviteEmail} has been added to the team`);
      } else {
        setMessage(`Invitation sent to ${inviteEmail}`);
      }
      await loadOrg();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.message}`);
    }
    setInviting(false);
  }

  async function updateRole(memberId: string, role: "admin" | "member") {
    setMessage(null);
    const res = await fetch("/api/organization/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    if (res.ok) {
      await loadOrg();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.message}`);
    }
  }

  async function removeMember(memberId: string) {
    setMessage(null);
    const res = await fetch("/api/organization/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      await loadOrg();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.message}`);
    }
  }

  async function revokeInvitation(invitationId: string) {
    setMessage(null);
    const res = await fetch("/api/organization/invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    if (res.ok) {
      await loadOrg();
    } else {
      const err = await res.json();
      setMessage(`Error: ${err.message}`);
    }
  }

  async function saveOrgName() {
    if (!orgName.trim() || !org) return;
    const res = await fetch("/api/organization", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName }),
    });
    if (res.ok) {
      setEditingName(false);
      await loadOrg();
    }
  }

  const isAdmin = org?.role === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading team...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization members and their permissions.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization. If the user
                  already has an account, they will be added immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "admin" | "member")
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    <strong>Admin:</strong> Can manage projects, members, and
                    settings.
                    <br />
                    <strong>Member:</strong> Can view projects and use the BCF
                    connector.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={invite}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {message && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm">
          {message}
        </div>
      )}

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="max-w-xs"
              />
              <Button size="sm" onClick={saveOrgName}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingName(false);
                  setOrgName(org?.name ?? "");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-medium">{org?.name}</span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Members ({org?.members.length ?? 0})
          </CardTitle>
          <CardDescription>
            People who have access to this organization and its projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {org?.members.map((member, idx) => (
            <div key={member.id}>
              {idx > 0 && <Separator className="my-1" />}
              <div className="flex items-center gap-3 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {(member.name ?? member.email)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.name ?? member.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <Badge
                  variant={member.role === "admin" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {member.role === "admin" ? (
                    <>
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </>
                  ) : (
                    <>
                      <User className="mr-1 h-3 w-3" />
                      Member
                    </>
                  )}
                </Badge>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === "member" ? (
                        <DropdownMenuItem
                          onClick={() => updateRole(member.id, "admin")}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => updateRole(member.id, "member")}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Make Member
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {isAdmin && org?.invitations && org.invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Pending Invitations ({org.invitations.length})
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {org.invitations.map((inv, idx) => (
              <div key={inv.id}>
                {idx > 0 && <Separator className="my-1" />}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {inv.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => revokeInvitation(inv.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
