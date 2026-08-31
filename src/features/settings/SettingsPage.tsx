import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { backupService, type BackupInspectionResult } from "@/db/backup/backup.service";
import { settingsRepository, SETTING_KEYS, DEFAULT_ACADEMIC_YEAR } from "@/db/repositories/settings.repository";
import { seedDatabase } from "@/db/seed";
import { securityService } from "@/services/security.service";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RestoreInspectionModal } from "./RestoreInspectionModal";
import { AcademicYearModal } from "../timetable/AcademicYearModal";
import { formatDateTime } from "@/lib/utils";
import type { AcademicYearConfig } from "@/types/database";
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
  Lock,
  Key,
  Eye,
  EyeOff,
  CalendarRange,
  RefreshCcw,
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
  const [isAcademicYearModalOpen, setIsAcademicYearModalOpen] = useState(false);
  const [pendingRestoreJson, setPendingRestoreJson] = useState<string | null>(null);
  const [inspectionResult, setInspectionResult] = useState<BackupInspectionResult | null>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);

  const academicYearSetting = useLiveQuery(
    () => db.settings.get(SETTING_KEYS.ACADEMIC_YEAR),
    []
  );

  const academicConfig: AcademicYearConfig = academicYearSetting?.value
    ? (academicYearSetting.value as AcademicYearConfig)
    : DEFAULT_ACADEMIC_YEAR;

  // Security / Password State
  const [hasCustomPass, setHasCustomPass] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

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
    setHasCustomPass(securityService.hasCustomPassword());
    
    const autoBackup = await settingsRepository.getAutoBackupEnabled();
    setAutoBackupEnabled(autoBackup);
  };

  useEffect(() => {
    refreshBackupState();
  }, []);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await backupService.exportAndDownloadBackup();
      await refreshBackupState();
      setStatusMessage("Backup downloaded successfully to your local machine! All current data is safely preserved.");
    } catch (err) {
      alert("Export failed: " + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        try {
          const inspection = await backupService.inspectBackup(content);
          setInspectionResult(inspection);
          setPendingRestoreJson(content);
          setIsConfirmRestoreOpen(true);
        } catch (err) {
          alert("Invalid backup file: " + (err as Error).message);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreJson) return;
    setIsRestoring(true);
    try {
      const result = await backupService.importBackup(pendingRestoreJson);
      setStatusMessage(
        `Successfully restored ${result.stats.classes ?? 0} classes, ${result.stats.students ?? 0} students, ${result.stats.grades ?? 0} grades, and ${result.stats.files ?? 0} documents!`
      );
      setPendingRestoreJson(null);
      setInspectionResult(null);
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

  const handleToggleAutoBackup = async () => {
    const newValue = !autoBackupEnabled;
    await settingsRepository.setAutoBackupEnabled(newValue);
    setAutoBackupEnabled(newValue);
    setStatusMessage(`Automated weekly backups are now ${newValue ? 'ENABLED' : 'DISABLED'}.`);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!currentPass.trim()) {
      setPassError("Please enter your current master password.");
      return;
    }

    if (!securityService.verifyPassword(currentPass)) {
      setPassError("Incorrect current master password.");
      return;
    }

    if (!newPass.trim()) {
      setPassError("New password cannot be blank.");
      return;
    }

    if (newPass.trim().length < 3) {
      setPassError("New password must be at least 3 characters long.");
      return;
    }

    if (newPass !== confirmPass) {
      setPassError("New passwords do not match.");
      return;
    }

    securityService.setMasterPassword(newPass);
    setCurrentPass("");
    setNewPass("");
    setConfirmPass("");
    setHasCustomPass(securityService.hasCustomPassword());
    setPassSuccess("Master deletion password updated successfully!");
  };

  const handleResetPassword = () => {
    if (confirm("Reset master password back to default ('admin')?")) {
      securityService.resetToDefault();
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setPassError("");
      setHasCustomPass(false);
      setPassSuccess("Master deletion password has been reset to 'admin'.");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings & Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage local IndexedDB storage, export 7-day backups, configure master deletion password, and display theme.
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

      {/* Security & Master Deletion Password Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Security & Master Deletion Password
            </CardTitle>
            <Badge
              variant={hasCustomPass ? "success" : "secondary"}
              className="text-[11px] gap-1"
            >
              <Key className="w-3 h-3" />
              {hasCustomPass ? "Custom Password Active" : "Default Password Active ('admin')"}
            </Badge>
          </div>
          <CardDescription>
            Every delete button across classes, students, marks, homework, detentions, notes, and files requires entering this master password to prevent accidental or unauthorized data loss.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {passSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showCurrentPass ? "text" : "password"}
                  placeholder={hasCustomPass ? "Current password..." : "Default: admin"}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="New Master Password"
                  type={showNewPass ? "text" : "password"}
                  placeholder="New password or PIN..."
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat new password..."
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Button type="submit" size="sm" className="gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Save New Password</span>
              </Button>

              {hasCustomPass && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-muted-foreground hover:text-destructive underline transition-colors"
                >
                  Reset to default ('admin')
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Academic Year & School Holidays Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-indigo-500" />
              Academic Year & Custom School Holidays
            </CardTitle>
            <Badge variant="secondary" className="text-[11px]">
              {academicConfig.name || "Academic Year"}
            </Badge>
          </div>
          <CardDescription>
            Configure your term start and finish dates, plus customized half-term breaks, bank holidays, and teacher INSET days.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-3.5 rounded-xl bg-muted/40 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Active Academic Term Window:</span>
              <span className="font-bold text-foreground font-mono">
                {academicConfig.startDate} → {academicConfig.endDate}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Custom School Holidays Configured:</span>
              <span className="font-bold text-foreground">
                {academicConfig.holidays?.length || 0} breaks & closures
              </span>
            </div>
          </div>

          <div className="flex items-center justify-start pt-1">
            <Button
              onClick={() => setIsAcademicYearModalOpen(true)}
              className="gap-2"
            >
              <CalendarRange className="w-4 h-4" />
              <span>Configure Term Dates & Custom Holidays</span>
            </Button>
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
            Export all student marks, timetable records, and documents into a portable JSON backup. Downloading a backup never clears or deletes your database data.
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
              <span>{isRestoring ? "Inspecting & Restoring..." : "Restore From Backup File"}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelectForRestore}
                disabled={isRestoring}
                className="hidden"
              />
            </label>

            <Button
              onClick={handleToggleAutoBackup}
              variant={autoBackupEnabled ? "default" : "outline"}
              className={`gap-2 ${autoBackupEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              <RefreshCcw className={`w-4 h-4 ${autoBackupEnabled ? "animate-spin-slow" : ""}`} />
              <span>Auto-Backup (Weekly): {autoBackupEnabled ? "ON" : "OFF"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Samsung Tablet & Offline Installation Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            Samsung Galaxy Tab S10 FE+ & Offline Tablet Guide
          </CardTitle>
          <CardDescription>
            How to run this system 100% offline as an installed app on your Samsung Tablet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-relaxed">
          <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>📱 Method 1: Install as Native Tablet App (PWA)</span>
            </div>
            <p className="text-muted-foreground">
              Open this URL on your tablet's browser (Chrome or Samsung Internet), tap the <strong>3 dots Menu (⋮)</strong> &gt; <strong>Add page to</strong> &gt; <strong>App screen / Home screen</strong>. The app installs as a standalone icon that opens full-screen without URL bars and functions 100% offline.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <span>💾 Offline Data Guarantee</span>
            </div>
            <p className="text-muted-foreground">
              All classes, marks, notes, and PDF files are stored inside your tablet's private IndexedDB database. They never expire and remain safe even when the tablet is restarted or in Airplane Mode.
            </p>
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

      {/* Academic Year & Custom Holidays Modal */}
      <AcademicYearModal
        isOpen={isAcademicYearModalOpen}
        onClose={() => setIsAcademicYearModalOpen(false)}
      />

      {/* Restore Inspection & Safety Modal */}
      <RestoreInspectionModal
        isOpen={isConfirmRestoreOpen}
        onClose={() => {
          setIsConfirmRestoreOpen(false);
          setPendingRestoreJson(null);
          setInspectionResult(null);
        }}
        onConfirmRestore={handleConfirmRestore}
        onExportCurrentBackup={handleExportBackup}
        inspection={inspectionResult}
        isLoading={isRestoring}
      />
    </div>
  );
}
