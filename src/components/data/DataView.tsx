"use client";
import { Database, Download, Lock, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { AppActions } from "@/hooks/useAppData";
import type { AppData, ISODate } from "@/types";
import { downloadFile } from "@/utils/download";
import { backupFilename, parseAppData, serializeBackup } from "@/utils/storage";
import { Button, Card, CardTitle } from "../ui";

export function DataView({ data, today, actions }: { data: AppData; today: ISODate; actions: AppActions }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const hasData = data.outages.length > 0 || data.profile.deactivationOverride !== null;

  const onImport = async (file: File) => {
    try {
      const parsed = parseAppData(JSON.parse(await file.text()));
      if (!window.confirm(`Replace all current data with ${parsed.outages.length} outage(s) from "${file.name}"?`)) return;
      actions.replaceAll(parsed);
      setMessage({ ok: true, text: `Imported ${parsed.outages.length} outage(s).` });
    } catch (e) {
      setMessage({ ok: false, text: `Import failed: ${e instanceof Error ? e.message : "invalid file"}` });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle icon={<Lock className="h-4 w-4" />}>Privacy</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>All records are stored only in this browser on this device (localStorage). Nothing is sent to a server.</li>
          <li>Nuke30 never asks for SSNs, driver&apos;s license or badge numbers, badge photos, or site security details — don&apos;t put them in notes.</li>
          <li>Use JSON backups to move your data between devices. You control the file.</li>
        </ul>
      </Card>

      <Card>
        <CardTitle icon={<Database className="h-4 w-4" />}>Backup &amp; Restore</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => downloadFile(backupFilename(), serializeBackup(data), "application/json")}
          >
            <Download className="h-4 w-4" /> Export Backup (.json)
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import Backup (.json)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
            }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Saves as {backupFilename()}</p>
        {message && (
          <p
            role="status"
            className={
              message.ok
                ? "mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-500/15 dark:text-red-200"
            }
          >
            {message.text}
          </p>
        )}
      </Card>

      <Card>
        <CardTitle icon={<Sparkles className="h-4 w-4" />}>Demo &amp; Reset</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (!hasData || window.confirm("Replace your current data with demo outage data?")) {
                actions.loadDemo(today);
                setMessage({ ok: true, text: "Demo outage data loaded." });
              }
            }}
          >
            <Sparkles className="h-4 w-4" /> Load Demo Outage Data
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Clear ALL Nuke30 data from this device? Export a backup first if you need it.")) {
                actions.clearAll();
                setMessage({ ok: true, text: "All data cleared." });
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Clear All Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
