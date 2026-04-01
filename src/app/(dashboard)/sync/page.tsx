"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, Tag, GitBranch, Loader2 } from "lucide-react";

interface SyncData {
  users: { id: string; name: string; email: string }[];
  statuses: { id: string; name: string; color: string; type: string }[];
  labels: { id: string; name: string; color: string }[];
}

export default function SyncPage() {
  const [data, setData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/sync");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        const fresh: SyncData = await res.json();
        setData(fresh);
        setMessage("✅ Synced successfully from Linear");
      } else {
        const err = await res.json();
        setMessage(`❌ ${err.message}`);
      }
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sync</h1>
          <p className="text-muted-foreground mt-1">
            Pull users, statuses, and labels from Linear into the BCF connector.
          </p>
        </div>
        <Button onClick={sync} disabled={syncing || loading}>
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </>
          )}
        </Button>
      </div>

      {message && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm">{message}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="rounded-md border bg-card px-4 py-8 text-center text-muted-foreground">
          Connect your Linear account first to sync data.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Users
              </CardTitle>
              <CardDescription>{data.users.length} members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.users.slice(0, 10).map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
              ))}
              {data.users.length > 10 && (
                <p className="text-xs text-muted-foreground">+{data.users.length - 10} more</p>
              )}
            </CardContent>
          </Card>

          {/* Statuses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" />
                Statuses
              </CardTitle>
              <CardDescription>{data.statuses.length} workflow states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.statuses.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm">{s.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {s.type}
                  </Badge>
                </div>
              ))}
              {data.statuses.length === 0 && (
                <p className="text-xs text-muted-foreground">No statuses found. Select a team in Settings.</p>
              )}
            </CardContent>
          </Card>

          {/* Labels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4" />
                Labels
              </CardTitle>
              <CardDescription>{data.labels.length} labels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.labels.map((l) => (
                <div key={l.id} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="text-sm">{l.name}</span>
                </div>
              ))}
              {data.labels.length === 0 && (
                <p className="text-xs text-muted-foreground">No labels found. Select a team in Settings.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
