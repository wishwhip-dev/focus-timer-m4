"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDrop } from "@/components/file-drop";
import { database } from "@/lib/db";
import { useDatabaseTransfer, useStorageStatus } from "@/lib/storage/react";

/**
 * Export and import for the whole database, plus the honest word about a browser that would not
 * keep anything. The storage document asks that both directions stay reachable in every app built
 * here: preview and the published site are different origins, and a browser can clear this data.
 */
export function DataPanel() {
  const status = useStorageStatus(database);
  const { state, exportToFile, importFromFile } = useDatabaseTransfer(database);

  const onFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    void importFromFile(file, "merge");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>Everything lives in this browser. Export a file to carry it elsewhere.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status === "memory" && (
          <p className="text-sm text-destructive">
            This browser refused to keep data, so your history will not survive closing the page.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void exportToFile()} disabled={state.kind === "working"}>
            Export data
          </Button>
          <FileDrop accept=".json,application/json" maxBytes={5_000_000} label="Load backup" onFiles={onFiles} className="flex-1 basis-52">
            <span className="text-xs text-muted-foreground">A JSON file exported from this app, merged into your history.</span>
          </FileDrop>
        </div>
        {state.kind === "imported" && (
          <p className="text-sm" role="status">
            Backup loaded: {state.result.added} row{state.result.added === 1 ? "" : "s"} added.
          </p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive" role="alert">
            {state.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}