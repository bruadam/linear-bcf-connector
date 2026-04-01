"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileArchive, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ImportResult {
  imported: number;
  failed: number;
  results: { bcfGuid: string; linearIssueId: string; title: string }[];
  errors: { bcfGuid: string; error: string }[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.endsWith(".bcf") && !f.name.endsWith(".bcfzip") && !f.name.endsWith(".zip")) {
      setError("Please select a BCF ZIP file (.bcf or .bcfzip)");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function importFile() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import-bcf", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Import failed");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import BCF</h1>
        <p className="text-muted-foreground mt-1">
          Upload a BCF ZIP file to import topics as Linear issues.
        </p>
      </div>

      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="rounded-full bg-muted p-4">
            <FileArchive className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Drop a BCF ZIP file here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".bcf,.bcfzip,.zip"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Choose file
          </Button>
          {file && (
            <Badge variant="secondary" className="gap-1">
              <FileArchive className="h-3 w-3" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </Badge>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {file && !result && (
        <Button onClick={importFile} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import {file.name}
            </>
          )}
        </Button>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
            <CardDescription>
              <span className="text-green-600 font-medium">{result.imported} imported</span>
              {result.failed > 0 && (
                <span className="text-destructive ml-2">{result.failed} failed</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.results.map((r) => (
              <div key={r.bcfGuid} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="flex-1 truncate">{r.title}</span>
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {r.linearIssueId.slice(0, 8)}
                </Badge>
              </div>
            ))}
            {result.errors.map((e) => (
              <div key={e.bcfGuid} className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{e.bcfGuid}</span>
                <span className="text-xs">{e.error}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
