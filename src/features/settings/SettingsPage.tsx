import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { backupService } from "@/db/backup/backup.service";
import { settingsRepository } from "@/db/repositories/settings.repository";
import { seedDatabase } from "@/db/seed";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { formatDateTime } from "@/lib/utils";
import {
  Moon,
  Sun,
  Laptop,
  Download,
  Upload,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [reminderInfo, setReminderInfo] = useState<{
    shouldRemind: boolean;
    daysSince: number | null;
    lastBackupDate: string | null;
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
  const [pendingRestoreJson, setPendingRestoreJson] = useState<string | null>(null);

  // Live row counts
  const classesCount = useLiveQuery(() => db.classes.count(), []);
  const studentsCount = useLiveQuery(() => db.students.count(), []);
  const assessmentsCount = useLiveQuery(() => db.assessments.count(), []);
  const gradesCount = useLiveQuery(() => db.grades.count(), []);
  const homeworkCount = useLiveQuery(() => db.homework.count(), []);
  const detentionsCount = useLiveQuery(() => db.detentions.count(), []);
  const notesCount = useLiveQuery(() => db.notes.count(), []);
  const filesCount = useLiveQuery(() => db.files.count(), []);
  const tasksCount = useLiveQuery(() => db.tasks.count(), []);

  const refreshBackupState = async () => {
    const backupDate = await settingsRepository.getLastBackupDate();
    setLastBackup(backupDate);
    const reminder = await settingsRepository.checkBackupReminder();
    setReminderInfo(reminder);
  };

  useEffect(() => {
    refreshBackupState();
  }, []);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await backupService.exportAndDownloadBackup();
      setStatusMessage("Backup downloaded successfully! Settings updated.");
      await refreshBackupState();
    } catch (err) {
      alert("Backup export error: " + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      setPendingRestoreJson(json);
      setIsConfirmRestoreOpen(true);
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreJson) return;
    setIsRestoring(true);
    try {
      const result = await backupService.importBackup(pendingRestoreJson);
      setStatusMessage(
        `Restoration complete! Restored ${result.stats.classes} classes, ${result.stats.students} students, and ${result.stats.files} documents.`
      );
      setPendingRestoreJson(null);
      setIsConfirmRestoreOpen(false);
      await refreshBackupState();
    } catch (err) {
      alert("Restore failed: " + (err as Error).message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleReSeedData = async () => {
    if (!confirm("Populate realistic sample classes, students, and timetable entries?")) {
      return;
    }
    setIsReseeding(true);
    try {
      await seedDatabase();
      setStatusMessage("Sample school dataset loaded into IndexedDB!");
    } catch (err) {
      alert("Seed error: " + (err as Error).message);
    } finally {
      setIsReseeding(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings & Backup</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage local IndexedDB storage, export 7-day backups, and configure display theme.
        </p>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Theme Preference */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            Interface Theme & Appearance
          </CardTitle>
          <CardDescription>
            Choose your preferred color theme. Stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === "light"
                  ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20"
                  : "border-border bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-xs">Light Mode</span>
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === "dark"
                  ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20"
                  : "border-border bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <span className="text-xs">Dark Mode</span>
            </button>

            <button
              onClick={() => setTheme("system")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                theme === "system"
                  ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20"
                  : "border-border bg-card hover:bg-accent text-muted-foreground"
              }`}
            >
              <Laptop className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">System Match</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Backup Center */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Local Backup & Restore Center
            </CardTitle>
            {reminderInfo?.shouldRemind ? (
              <Badge variant="warning" className="gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3" /> Backup Recommended (7+ Days)
              </Badge>
            ) : (
              <Badge variant="success" className="text-[11px]">
                Backup Up-to-date
              </Badge>
            )}
          </div>
          <CardDescription>
            Export all student marks, timetable records, and documents into a portable JSON backup. Files stored natively as Blobs are converted safely during export.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Last Local Backup Created:</span>
            <span className="font-semibold text-foreground">
              {formatDateTime(lastBackup)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Generating..." : "Export Full Backup"}</span>
            </Button>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent text-foreground text-sm font-medium transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? "Restoring..." : "Restore From Backup File"}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelectForRestore}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Database Statistics */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            Local IndexedDB Database Metrics
          </CardTitle>
          <CardDescription>
            Live entity records currently stored inside your private browser database.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Classes</span>
              <span className="text-base font-bold text-foreground">{classesCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Students</span>
              <span className="text-base font-bold text-foreground">{studentsCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Assessments</span>
              <span className="text-base font-bold text-foreground">{assessmentsCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Grades</span>
              <span className="text-base font-bold text-foreground">{gradesCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Homework</span>
              <span className="text-base font-bold text-foreground">{homeworkCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Detentions</span>
              <span className="text-base font-bold text-foreground">{detentionsCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Notes</span>
              <span className="text-base font-bold text-foreground">{notesCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Documents</span>
              <span className="text-base font-bold text-foreground">{filesCount ?? 0}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block">Tasks</span>
              <span className="text-base font-bold text-foreground">{tasksCount ?? 0}</span>
            </div>
          </div>

          <div className="pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Need sample data for demonstration?
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReSeedData}
              disabled={isReseeding}
              className="gap-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>{isReseeding ? "Seeding..." : "Load Sample Dataset"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmRestoreOpen}
        onClose={() => setIsConfirmRestoreOpen(false)}
        onConfirm={handleConfirmRestore}
        title="Restore Backup and Overwrite Existing Data?"
        message="Restoring from a backup will completely replace all existing records, students, grades, homework, detentions, and uploaded documents in your database with the backup data. This cannot be undone."
        confirmText="Confirm & Restore Everything"
        isLoading={isRestoring}
      />
    </div>
  );
}
